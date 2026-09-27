import { useEffect, useState } from 'react';

export type LiveStatus =
  | { kind: 'loading' }
  | { kind: 'open' }
  | { kind: 'fixing' }
  | { kind: 'resolved' }
  | { kind: 'preparing' }
  | { kind: 'offline' };

interface IncidentRow {
  id: string;
  status: 'ACTIVE' | 'MITIGATED' | 'RESOLVED';
}

/** Where the live demo's story stands right now, read from the same API the console uses. */
export function useLiveStatus(): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    // A sleeping free server takes about a minute to wake; stop waiting before that.
    const timer = window.setTimeout(() => controller.abort(), 20_000);

    fetch('/api/v1/incidents', { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = (await res.json()) as IncidentRow[];
        const incident = rows.find(row => row.id === 'INC-3312');
        if (!active) return;
        if (!incident) setStatus({ kind: 'preparing' });
        else if (incident.status === 'RESOLVED') setStatus({ kind: 'resolved' });
        else if (incident.status === 'MITIGATED') setStatus({ kind: 'fixing' });
        else setStatus({ kind: 'open' });
      })
      .catch(() => {
        if (active) setStatus({ kind: 'offline' });
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return status;
}
