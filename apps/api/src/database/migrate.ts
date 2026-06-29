import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { loadEnvironment } from '../config/load-environment';
import { createDatabaseConnection } from './database.connection';

loadEnvironment();
const { client, db } = createDatabaseConnection();

try {
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  console.info('Database migrations completed.');
} finally {
  client.close();
}
