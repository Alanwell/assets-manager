import { defineConfig } from 'drizzle-kit';
import { loadEnvironment } from './src/config/load-environment';

loadEnvironment();

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? './data/asset-manager.db',
  },
  strict: true,
  verbose: true,
});
