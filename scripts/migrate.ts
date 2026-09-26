#!/usr/bin/env tsx
import { getDb, closeDb } from '../src/store/db.js';
import { initializeSchema } from '../src/store/schema.js';

console.log('Running EPOCH database migration...');
const db = getDb();
initializeSchema(db);
console.log('Migration complete.');
closeDb();
