import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { AppDatabase } from './database.types';
import * as schema from './schema';

export function resolveDatabasePath(): string {
  const configured = process.env.DATABASE_URL ?? './data/asset-manager.db';
  if (configured === ':memory:') return configured;
  return isAbsolute(configured)
    ? configured
    : resolve(process.cwd(), configured);
}

export function createDatabaseConnection(): {
  client: Database.Database;
  db: AppDatabase;
} {
  const databasePath = resolveDatabasePath();
  if (databasePath !== ':memory:') {
    mkdirSync(dirname(databasePath), { recursive: true });
  }
  const client = new Database(databasePath);
  client.pragma('foreign_keys = ON');
  client.pragma('journal_mode = WAL');
  client.pragma('busy_timeout = 5000');
  return { client, db: drizzle(client, { schema }) };
}
