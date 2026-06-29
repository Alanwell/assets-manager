import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type Database from 'better-sqlite3';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { resolveDatabasePath } from '../database/database.connection';
import { SQLITE_CLIENT } from '../database/database.constants';

@Injectable()
export class BackupsService {
  constructor(
    @Inject(SQLITE_CLIENT) private readonly client: Database.Database,
  ) {}

  async create() {
    const directory = await this.ensureBackupDirectory();
    const name = `asset-manager-${timestampForFileName(new Date())}.db`;
    const destination = resolve(directory, name);
    await this.client.backup(destination);
    const metadata = await stat(destination);
    return {
      name,
      size: metadata.size,
      createdAt: metadata.birthtime.toISOString(),
    };
  }

  async list() {
    const directory = await this.ensureBackupDirectory();
    const names = (await readdir(directory)).filter(
      (name) => name.startsWith('asset-manager-') && name.endsWith('.db'),
    );
    const records = await Promise.all(
      names.map(async (name) => {
        const metadata = await stat(resolve(directory, name));
        return {
          name,
          size: metadata.size,
          createdAt: metadata.birthtime.toISOString(),
        };
      }),
    );
    return records.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  private async ensureBackupDirectory(): Promise<string> {
    const databasePath = resolveDatabasePath();
    if (databasePath === ':memory:') {
      throw new ServiceUnavailableException('内存数据库不支持文件备份');
    }
    const directory = process.env.BACKUP_DIR
      ? resolve(process.env.BACKUP_DIR)
      : resolve(dirname(databasePath), 'backups');
    await mkdir(directory, { recursive: true });
    return directory;
  }
}

function timestampForFileName(date: Date): string {
  return date.toISOString().replaceAll(':', '-').replaceAll('.', '-');
}
