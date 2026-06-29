import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import type Database from 'better-sqlite3';
import { createDatabaseConnection } from './database.connection';
import {
  DATABASE,
  DATABASE_CONNECTION,
  SQLITE_CLIENT,
} from './database.constants';

type DatabaseConnection = ReturnType<typeof createDatabaseConnection>;

class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(SQLITE_CLIENT) private readonly client: Database.Database,
  ) {}

  onApplicationShutdown(): void {
    if (this.client.open) this.client.close();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: (): DatabaseConnection => createDatabaseConnection(),
    },
    {
      provide: DATABASE,
      inject: [DATABASE_CONNECTION],
      useFactory: (connection: DatabaseConnection) => connection.db,
    },
    {
      provide: SQLITE_CLIENT,
      inject: [DATABASE_CONNECTION],
      useFactory: (connection: DatabaseConnection) => connection.client,
    },
    DatabaseLifecycle,
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
