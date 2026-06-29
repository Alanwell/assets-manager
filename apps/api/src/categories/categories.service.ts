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
import { assetCategories, assets } from '../database/schema';
import type { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  list(userId: string) {
    return this.db
      .select()
      .from(assetCategories)
      .where(eq(assetCategories.userId, userId))
      .orderBy(asc(assetCategories.sortOrder), asc(assetCategories.name))
      .all();
  }

  create(userId: string, dto: CreateCategoryDto) {
    try {
      return this.db
        .insert(assetCategories)
        .values({
          id: randomUUID(),
          userId,
          name: dto.name.trim(),
          sortOrder: dto.sortOrder ?? 0,
          ...(dto.icon === undefined ? {} : { icon: dto.icon }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning()
        .get();
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('分类名称已存在');
      }
      throw error;
    }
  }

  update(userId: string, id: string, dto: UpdateCategoryDto) {
    this.requireOwned(userId, id);
    try {
      return this.db
        .update(assetCategories)
        .set({
          ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
          ...(dto.icon === undefined ? {} : { icon: dto.icon }),
          ...(dto.sortOrder === undefined ? {} : { sortOrder: dto.sortOrder }),
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(eq(assetCategories.id, id), eq(assetCategories.userId, userId)),
        )
        .returning()
        .get();
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('分类名称已存在');
      }
      throw error;
    }
  }

  delete(userId: string, id: string): void {
    this.requireOwned(userId, id);
    const usage = this.db
      .select({ value: count() })
      .from(assets)
      .where(and(eq(assets.userId, userId), eq(assets.categoryId, id)))
      .get();
    if ((usage?.value ?? 0) > 0) {
      throw new ConflictException('该分类仍有关联资产，请先迁移资产');
    }
    this.db
      .delete(assetCategories)
      .where(
        and(eq(assetCategories.id, id), eq(assetCategories.userId, userId)),
      )
      .run();
  }

  requireOwned(userId: string, id: string) {
    const category = this.db
      .select()
      .from(assetCategories)
      .where(
        and(eq(assetCategories.id, id), eq(assetCategories.userId, userId)),
      )
      .get();
    if (!category) throw new NotFoundException('分类不存在');
    return category;
  }
}
