import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';

export function loadEnvironment(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
  ];
  const environmentFile = candidates.find((candidate) => existsSync(candidate));
  if (environmentFile) loadEnvFile(environmentFile);
}
