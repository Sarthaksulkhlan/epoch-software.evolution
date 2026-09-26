import type Database from 'better-sqlite3';

export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      event_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      repo TEXT,
      branch TEXT,
      payload TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workflows (
      workflow_id TEXT PRIMARY KEY,
      trigger_event_id TEXT REFERENCES events(event_id),
      kind TEXT NOT NULL DEFAULT 'feature',
      title TEXT,
      status TEXT NOT NULL,
      current_stage TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      context_ref TEXT,
      plan_ref TEXT,
      mutation_id TEXT
    );

    CREATE TABLE IF NOT EXISTS workflow_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id TEXT NOT NULL REFERENCES workflows(workflow_id),
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      stage TEXT,
      actor TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      task_id TEXT PRIMARY KEY,
      workflow_id TEXT REFERENCES workflows(workflow_id),
      agent_type TEXT NOT NULL,
      status TEXT NOT NULL,
      dependencies TEXT NOT NULL DEFAULT '[]',
      started_at INTEGER,
      completed_at INTEGER,
      input_ref TEXT,
      output_ref TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      artifact_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      source_task_id TEXT REFERENCES tasks(task_id),
      content_ref TEXT NOT NULL,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      mime_type TEXT
    );

    CREATE TABLE IF NOT EXISTS evidence (
      evidence_id TEXT PRIMARY KEY,
      workflow_id TEXT REFERENCES workflows(workflow_id),
      task_id TEXT REFERENCES tasks(task_id),
      claim TEXT NOT NULL,
      status TEXT NOT NULL,
      source_artifact_ref TEXT NOT NULL,
      finding_severity TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS decisions (
      decision_id TEXT PRIMARY KEY,
      workflow_id TEXT REFERENCES workflows(workflow_id),
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      rationale TEXT,
      scope TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mutations (
      mutation_id TEXT PRIMARY KEY,
      workflow_id TEXT REFERENCES workflows(workflow_id),
      intent TEXT NOT NULL,
      affected_components TEXT NOT NULL,
      delta_summary TEXT,
      evidence_refs TEXT NOT NULL,
      trajectory_delta TEXT NOT NULL,
      epoch_id TEXT,
      created_at INTEGER NOT NULL,
      commit_sha TEXT,
      author TEXT,
      compensates_mutation_id TEXT
    );

    CREATE TABLE IF NOT EXISTS graph_edges (
      edge_id TEXT PRIMARY KEY,
      from_id TEXT NOT NULL,
      from_type TEXT NOT NULL,
      to_id TEXT NOT NULL,
      to_type TEXT NOT NULL,
      relationship TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 1.0,
      evidence_ref TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invariants (
      invariant_id TEXT PRIMARY KEY,
      statement TEXT NOT NULL,
      owner TEXT,
      scope_components TEXT NOT NULL,
      status TEXT NOT NULL,
      last_checked_mutation_id TEXT,
      violation_mutations TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trajectory_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mutation_id TEXT REFERENCES mutations(mutation_id),
      timestamp INTEGER NOT NULL,
      coupling_score REAL NOT NULL,
      boundary_integrity_score REAL NOT NULL,
      drift_delta REAL NOT NULL,
      epoch_id TEXT NOT NULL,
      state_hash TEXT NOT NULL,
      scan TEXT
    );

    CREATE TABLE IF NOT EXISTS epochs (
      epoch_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_mutation_id TEXT NOT NULL,
      end_mutation_id TEXT,
      defining_properties TEXT NOT NULL,
      boundary_evidence TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drift_findings (
      finding_id TEXT PRIMARY KEY,
      pattern TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      invariant_id TEXT,
      components TEXT NOT NULL,
      mutation_ids TEXT NOT NULL,
      evidence_refs TEXT NOT NULL,
      earliest_plausible_mutation_id TEXT,
      measurement TEXT NOT NULL,
      status TEXT NOT NULL,
      detected_at INTEGER NOT NULL,
      detected_by_mutation_id TEXT NOT NULL,
      resolved_by_mutation_id TEXT
    );

    CREATE TABLE IF NOT EXISTS incidents (
      incident_id TEXT PRIMARY KEY,
      signal TEXT NOT NULL,
      severity TEXT NOT NULL,
      affected_component TEXT NOT NULL,
      detected_at INTEGER NOT NULL,
      reproduction_ref TEXT,
      candidate_mutations TEXT,
      remediation_workflow_id TEXT,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS simulations (
      simulation_id TEXT PRIMARY KEY,
      base_mutation_id TEXT REFERENCES mutations(mutation_id),
      base_state_hash TEXT NOT NULL,
      hypothesis TEXT NOT NULL,
      scenarios TEXT NOT NULL,
      status TEXT NOT NULL,
      outcome_ref TEXT,
      selected_scenario_id TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
    CREATE INDEX IF NOT EXISTS idx_workflow_events_workflow ON workflow_events(workflow_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_workflow ON tasks(workflow_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_workflow ON evidence(workflow_id);
    CREATE INDEX IF NOT EXISTS idx_mutations_epoch ON mutations(epoch_id);
    CREATE INDEX IF NOT EXISTS idx_graph_edges_from ON graph_edges(from_id, relationship);
    CREATE INDEX IF NOT EXISTS idx_graph_edges_to ON graph_edges(to_id, relationship);
    CREATE INDEX IF NOT EXISTS idx_trajectory_mutation ON trajectory_points(mutation_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_component ON incidents(affected_component);
    CREATE INDEX IF NOT EXISTS idx_drift_status ON drift_findings(status);
  `);

  // Databases created by earlier versions lack these columns.
  ensureColumn(db, 'workflows', 'kind', "TEXT NOT NULL DEFAULT 'feature'");
  ensureColumn(db, 'workflows', 'title', 'TEXT');
  ensureColumn(db, 'mutations', 'commit_sha', 'TEXT');
  ensureColumn(db, 'mutations', 'author', 'TEXT');
  ensureColumn(db, 'mutations', 'compensates_mutation_id', 'TEXT');
  ensureColumn(db, 'trajectory_points', 'scan', 'TEXT');
}

function ensureColumn(db: Database.Database, table: string, column: string, ddl: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}
