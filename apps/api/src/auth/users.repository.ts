import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE } from '../database/database.constants';
import type { AppDatabase } from '../database/database.types';
import { users } from '../database/schema';

export type UserRecord = typeof users.$inferSelect;

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  findByEmail(email: string): UserRecord | undefined {
    return this.db.select().from(users).where(eq(users.email, email)).get();
  }

  findById(id: string): UserRecord | undefined {
    return this.db.select().from(users).where(eq(users.id, id)).get();
  }
}
