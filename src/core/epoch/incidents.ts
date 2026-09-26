import { eventBus } from '../events/bus.js';
import { graphEdges, incidents } from '../../store/index.js';
import type { Incident } from '../../shared/schema/incident.schema.js';
import type { RepoSpec } from '../../graph/scanner/spec.js';
import type { ScanResult } from '../../graph/scanner/scanner.js';
import { causalArchaeologist } from '../../graph/causal/archaeologist.js';
import { generateEdgeId } from '../../shared/utils/id.js';
import type { EvidenceWriter } from './evidence-writer.js';

/** First incident id; keeps the demo's incident at INC-3312 after every reset. */
const INCIDENT_FLOOR = 3312;

export interface IncidentChanges {
  detected: Incident[];
  resolved: Incident[];
}

/**
 * Turns runtime probe results into incidents. A failing probe opens an
 * incident with a candidate causal chain; a passing probe resolves it and the
 * mutation gets a REMEDIATES edge.
 */
export class IncidentMonitor {
  reconcile(scan: ScanResult, spec: RepoSpec, mutationId: string, at: number, writer: EvidenceWriter): IncidentChanges {
    const changes: IncidentChanges = { detected: [], resolved: [] };
    for (const probe of spec.probes) {
      const result = scan.probes?.find(p => p.id === probe.id);
      if (!result) continue;
      const open = incidents.findOpenIncidentBySignal(probe.incident.signal);

      if (!result.ok && !open) {
        const incident: Incident = {
          incident_id: `INC-${incidents.nextIncidentSequence(INCIDENT_FLOOR)}`,
          signal: probe.incident.signal,
          severity: probe.incident.severity,
          affected_component: probe.component,
          detected_at: at,
          reproduction_ref: `probe:${probe.id}@${mutationId}`,
          status: 'detected'
        };
        incidents.insertIncident(incident);
        writer.record(`Incident ${incident.incident_id} opened: ${result.detail}`, 'observed', incident.reproduction_ref ?? `probe:${probe.id}`, probe.incident.severity);

        const chain = causalArchaeologist.traceIncident(incident.incident_id);
        incidents.setCandidateMutations(incident.incident_id, chain.chain);
        for (const candidate of chain.candidates) {
          graphEdges.insertEdge({
            edge_id: generateEdgeId(),
            from_id: incident.incident_id,
            from_type: 'incident',
            to_id: candidate.mutationId,
            to_type: 'mutation',
            relationship: 'CAUSED_BY',
            confidence: Math.max(0.1, Math.min(0.95, candidate.score)),
            evidence_ref: incident.reproduction_ref ?? `probe:${probe.id}`,
            created_at: at
          });
        }
        changes.detected.push({ ...incident, candidate_mutations: chain.chain });
      } else if (result.ok && open) {
        incidents.updateIncidentStatus(open.incident_id, 'resolved');
        graphEdges.insertEdge({
          edge_id: generateEdgeId(),
          from_id: mutationId,
          from_type: 'mutation',
          to_id: open.incident_id,
          to_type: 'incident',
          relationship: 'REMEDIATES',
          confidence: 1,
          evidence_ref: `probe:${probe.id}@${mutationId}`,
          created_at: at
        });
        writer.record(`Incident ${open.incident_id} resolved: probe ${probe.id} passes after ${mutationId}. ${result.detail}`, 'observed', `probe:${probe.id}@${mutationId}`);
        changes.resolved.push({ ...open, status: 'resolved' });
      }
    }
    return changes;
  }

  announce(changes: IncidentChanges, mutationId: string): void {
    for (const incident of changes.detected) {
      eventBus.emit('incident.detected', { incidentId: incident.incident_id, signal: incident.signal, severity: incident.severity, mutationId, candidateMutations: incident.candidate_mutations ?? [] });
    }
    for (const incident of changes.resolved) {
      eventBus.emit('incident.resolved', { incidentId: incident.incident_id, mutationId });
    }
  }
}

export const incidentMonitor = new IncidentMonitor();
