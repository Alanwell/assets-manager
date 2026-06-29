import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, count, eq } from 'drizzle-orm';
import { isUniqueConstraintError } from '../common/database/sqlite-error';
import { DATABASE } from '../database/database.constants';
import type { AppDatabase } from '../database/database.types';
import { assetTagRelations, assetTags } from '../database/schema';
import type { CreateTagDto, UpdateTagDto } from './tags.dto';

@Injectable()
export class TagsService {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  list(userId: string) {
    return this.db
      .select()
      .from(assetTags)
      .where(eq(assetTags.userId, userId))
      .orderBy(asc(assetTags.name))
      .all();
  }

  create(userId: string, dto: CreateTagDto) {
    try {
      return this.db
        .insert(assetTags)
        .values({
          id: randomUUID(),
          userId,
          name: dto.name.trim(),
          ...(dto.color === undefined ? {} : { color: dto.color }),
          createdAt: new Date().toISOString(),
        })
        .returning()
        .get();
    } catch (error) {
      if (isUniqueConstraintError(error))
        throw new ConflictException('标签名称已存在');
      throw error;
    }
  }

  update(userId: string, id: string, dto: UpdateTagDto) {
    this.requireOwned(userId, id);
    try {
      return this.db
        .update(assetTags)
        .set({
          ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
          ...(dto.color === undefined ? {} : { color: dto.color }),
        })
        .where(and(eq(assetTags.id, id), eq(assetTags.userId, userId)))
        .returning()
        .get();
    } catch (error) {
      if (isUniqueConstraintError(error))
        throw new ConflictException('标签名称已存在');
      throw error;
    }
  }

  delete(userId: string, id: string): void {
    this.requireOwned(userId, id);
    const usage = this.db
      .select({ value: count() })
      .from(assetTagRelations)
      .where(eq(assetTagRelations.tagId, id))
      .get();
    if ((usage?.value ?? 0) > 0) {
      throw new ConflictException('该标签仍有关联资产，请先解除关联');
    }
    this.db
      .delete(assetTags)
      .where(and(eq(assetTags.id, id), eq(assetTags.userId, userId)))
      .run();
  }

  requireOwned(userId: string, id: string) {
    const tag = this.db
      .select()
      .from(assetTags)
      .where(and(eq(assetTags.id, id), eq(assetTags.userId, userId)))
      .get();
    if (!tag) throw new NotFoundException('标签不存在');
    return tag;
  }
}
