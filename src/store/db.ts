import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

let dbPath = process.env.EPOCH_DB_PATH || path.join(process.cwd(), 'data', 'epoch.db');
let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export function getDbPath(): string {
  return dbPath;
}

/**
 * Point the store at a different database file. Closes any open connection;
 * the next getDb() call opens the new path. Used by scripts and tests.
 */
export function setDbPath(nextPath: string): void {
  closeDb();
  dbPath = nextPath;
}

/** Delete the database file and its WAL side files. The connection must be closed. */
export function deleteDbFile(): void {
  closeDb();
  if (dbPath === ':memory:') return;
  for (const suffix of ['', '-wal', '-shm']) {
    const file = `${dbPath}${suffix}`;
    if (fs.existsSync(file)) fs.rmSync(file);
  }
}

export function transaction<T>(fn: () => T): T {
  return getDb().transaction(fn)();
}
