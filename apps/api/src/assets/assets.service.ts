import { AssetStatus, DepreciationMethod } from '@asset-manager/domain';
import {
  calculateAssetValueByProfiles,
  calculateDepreciation,
  DepreciationError,
  type DepreciationResult,
} from '@asset-manager/depreciation';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { isAbsolute, resolve, sep } from 'node:path';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DATABASE } from '../database/database.constants';
import { AppConfigService } from '../config/app-config.service';
import type { AppDatabase } from '../database/database.types';
import {
  assetAttachments,
  assetCategories,
  assetDepreciationProfiles,
  assetMaintenanceRecords,
  assets,
  assetStatusHistory,
  assetTagRelations,
  assetTags,
} from '../database/schema';
import type {
  AssetListQueryDto,
  ChangeAssetStatusDto,
  CreateAssetDto,
  UpdateAssetDto,
} from './assets.dto';

type AssetRecord = typeof assets.$inferSelect;

@Injectable()
export class AssetsService {
  constructor(
    @Inject(DATABASE) private readonly db: AppDatabase,
    private readonly config: AppConfigService,
  ) {}

  list(userId: string, query: AssetListQueryDto) {
    const conditions = this.buildListConditions(userId, query);
    const where = and(...conditions);
    const sortColumns = {
      name: assets.name,
      purchaseDate: assets.purchaseDate,
      purchasePriceCents: assets.purchasePriceCents,
      status: assets.status,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
    } as const;
    const sortColumn = sortColumns[query.sortBy as keyof typeof sortColumns];
    const total =
      this.db.select({ value: count() }).from(assets).where(where).get()
        ?.value ?? 0;
    const rows = this.db
      .select({ asset: assets, category: assetCategories })
      .from(assets)
      .leftJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
      .where(where)
      .orderBy(query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize)
      .all();
    const tagsByAsset = this.getTagsByAssetIds(rows.map((row) => row.asset.id));
    const asOfDate = new Date().toISOString().slice(0, 10);
    return {
      items: rows.map(({ asset, category }) => ({
        ...asset,
        category,
        tags: tagsByAsset.get(asset.id) ?? [],
        currentBookValueCents: this.calculateValue(asset, asOfDate)
          .currentBookValueCents,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  create(userId: string, dto: CreateAssetDto) {
    this.validateRelations(userId, dto.categoryId, dto.tagIds);
    this.validateDepreciationFields(dto);
    const id = randomUUID();
    const now = new Date().toISOString();
    const status = dto.status ?? AssetStatus.IN_USE;
    const method = dto.depreciationMethod ?? DepreciationMethod.NONE;
    this.db.transaction((tx) => {
      tx.insert(assets)
        .values(this.toInsertValues(id, userId, dto, now, status, method))
        .run();
      if (dto.tagIds?.length) {
        tx.insert(assetTagRelations)
          .values(dto.tagIds.map((tagId) => ({ assetId: id, tagId })))
          .run();
      }
      tx.insert(assetStatusHistory)
        .values({
          id: randomUUID(),
          assetId: id,
          toStatus: status,
          occurredAt: now,
          createdAt: now,
        })
        .run();
      if (dto.purchasePriceCents !== undefined) {
        tx.insert(assetDepreciationProfiles)
          .values({
            id: randomUUID(),
            assetId: id,
            version: 1,
            effectiveFrom:
              dto.depreciationStartDate ?? dto.purchaseDate ?? now.slice(0, 10),
            originalCostCents: dto.purchasePriceCents,
            residualValueCents: dto.residualValueCents ?? 0,
            ...(dto.usefulLifeMonths === undefined
              ? {}
              : { usefulLifeMonths: dto.usefulLifeMonths }),
            depreciationMethod: method,
            ...(dto.customAnnualDepreciationRate === undefined
              ? {}
              : {
                  customAnnualDepreciationRate:
                    dto.customAnnualDepreciationRate,
                }),
            ...(dto.customSchedule === undefined
              ? {}
              : { customScheduleJson: JSON.stringify(dto.customSchedule) }),
            createdAt: now,
          })
          .run();
      }
    });
    return this.getDetail(userId, id);
  }

  getDetail(userId: string, id: string) {
    const asset = this.requireOwned(userId, id);
    const category = asset.categoryId
      ? this.db
          .select()
          .from(assetCategories)
          .where(eq(assetCategories.id, asset.categoryId))
          .get()
      : undefined;
    return {
      ...asset,
      category: category ?? null,
      tags: this.getTagsByAssetIds([id]).get(id) ?? [],
      depreciation: this.calculateValue(
        asset,
        new Date().toISOString().slice(0, 10),
      ),
    };
  }

  update(userId: string, id: string, dto: UpdateAssetDto) {
    const existing = this.requireOwned(userId, id);
    this.validateRelations(userId, dto.categoryId, dto.tagIds);
    if (dto.status !== undefined) {
      throw new BadRequestException('资产状态变更请使用 status 接口');
    }
    const changesDepreciationRule =
      dto.residualValueCents !== undefined ||
      dto.usefulLifeMonths !== undefined ||
      dto.depreciationMethod !== undefined ||
      dto.customAnnualDepreciationRate !== undefined ||
      dto.depreciationStartDate !== undefined ||
      dto.customSchedule !== undefined;
    if (changesDepreciationRule) {
      throw new BadRequestException(
        '折旧规则变更请使用 depreciation-profiles 接口，以保留历史版本',
      );
    }
    if (
      dto.purchasePriceCents !== undefined &&
      this.db
        .select({ value: count() })
        .from(assetDepreciationProfiles)
        .where(eq(assetDepreciationProfiles.assetId, id))
        .get()!.value > 0
    ) {
      throw new BadRequestException('已有折旧快照时不能修改购置成本');
    }
    if (
      dto.purchasePriceCents !== undefined &&
      existing.residualValueCents !== null &&
      dto.purchasePriceCents < existing.residualValueCents
    ) {
      throw new BadRequestException('购置成本不得低于残值');
    }
    const values = this.toUpdateValues(dto);
    this.db.transaction((tx) => {
      tx.update(assets)
        .set({ ...values, updatedAt: new Date().toISOString() })
        .where(and(eq(assets.id, id), eq(assets.userId, userId)))
        .run();
      if (dto.tagIds !== undefined) {
        tx.delete(assetTagRelations)
          .where(eq(assetTagRelations.assetId, id))
          .run();
        if (dto.tagIds.length) {
          tx.insert(assetTagRelations)
            .values(dto.tagIds.map((tagId) => ({ assetId: id, tagId })))
            .run();
        }
      }
    });
    return this.getDetail(userId, id);
  }

  async delete(userId: string, id: string): Promise<void> {
    this.requireOwned(userId, id);
    const attachmentPaths = this.db
      .select({ storagePath: assetAttachments.storagePath })
      .from(assetAttachments)
      .where(
        and(
          eq(assetAttachments.assetId, id),
          eq(assetAttachments.userId, userId),
        ),
      )
      .all();
    const uploadRoot = isAbsolute(this.config.uploadDir)
      ? resolve(this.config.uploadDir)
      : resolve(process.cwd(), this.config.uploadDir);
    for (const attachment of attachmentPaths) {
      const path = resolve(uploadRoot, attachment.storagePath);
      if (path.startsWith(`${uploadRoot}${sep}`)) {
        await unlink(path).catch((error: unknown) => {
          if (!(
            error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT'
          )) {
            throw error;
          }
        });
      }
    }
    this.db
      .delete(assets)
      .where(and(eq(assets.id, id), eq(assets.userId, userId)))
      .run();
  }

  archive(userId: string, id: string) {
    const asset = this.requireOwned(userId, id);
    if (asset.status === AssetStatus.ARCHIVED) {
      throw new BadRequestException('资产已经归档');
    }
    return this.changeStatus(userId, id, {
      status: AssetStatus.ARCHIVED,
      note: '归档资产',
    });
  }

  restore(userId: string, id: string) {
    const asset = this.requireOwned(userId, id);
    if (asset.status !== AssetStatus.ARCHIVED) {
      throw new BadRequestException('只有已归档资产可以恢复');
    }
    const now = new Date().toISOString();
    this.db.transaction((tx) => {
      tx.update(assets)
        .set({ status: AssetStatus.IN_USE, archivedAt: null, updatedAt: now })
        .where(and(eq(assets.id, id), eq(assets.userId, userId)))
        .run();
      tx.insert(assetStatusHistory)
        .values({
          id: randomUUID(),
          assetId: id,
          fromStatus: asset.status,
          toStatus: AssetStatus.IN_USE,
          note: '恢复资产',
          occurredAt: now,
          createdAt: now,
        })
        .run();
    });
    return this.getDetail(userId, id);
  }

  changeStatus(userId: string, id: string, dto: ChangeAssetStatusDto) {
    const asset = this.requireOwned(userId, id);
    if (asset.status === dto.status) {
      throw new BadRequestException('资产已经处于目标状态');
    }
    if (
      asset.status === AssetStatus.ARCHIVED &&
      dto.status !== AssetStatus.ARCHIVED
    ) {
      throw new BadRequestException('已归档资产请使用 restore 接口恢复');
    }
    const occurredAt = dto.occurredAt ?? new Date().toISOString();
    const isDisposed = [
      AssetStatus.SOLD,
      AssetStatus.SCRAPPED,
      AssetStatus.LOST,
    ].includes(dto.status);
    const clearsDisposal = [AssetStatus.IN_USE, AssetStatus.IDLE].includes(
      dto.status,
    );
    this.db.transaction((tx) => {
      tx.update(assets)
        .set({
          status: dto.status,
          ...(dto.status === AssetStatus.ARCHIVED
            ? { archivedAt: occurredAt }
            : {}),
          ...(isDisposed ? { disposedAt: occurredAt } : {}),
          ...(isDisposed
            ? {
                ...(dto.disposalPriceCents === undefined
                  ? {}
                  : { disposalPriceCents: dto.disposalPriceCents }),
                ...(dto.note === undefined ? {} : { disposalNote: dto.note }),
              }
            : {}),
          ...(clearsDisposal
            ? {
                disposedAt: null,
                disposalPriceCents: null,
                disposalNote: null,
              }
            : {}),
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(assets.id, id), eq(assets.userId, userId)))
        .run();
      tx.insert(assetStatusHistory)
        .values({
          id: randomUUID(),
          assetId: id,
          fromStatus: asset.status,
          toStatus: dto.status,
          ...(dto.note === undefined ? {} : { note: dto.note }),
          occurredAt,
          createdAt: new Date().toISOString(),
        })
        .run();
    });
    return this.getDetail(userId, id);
  }

  getDepreciation(
    userId: string,
    id: string,
    asOfDate?: string,
  ): DepreciationResult {
    const asset = this.requireOwned(userId, id);
    try {
      return this.calculateValue(
        asset,
        asOfDate ?? new Date().toISOString().slice(0, 10),
      );
    } catch (error) {
      if (error instanceof DepreciationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  getTimeline(userId: string, id: string) {
    this.requireOwned(userId, id);
    const statusEvents = this.db
      .select()
      .from(assetStatusHistory)
      .where(eq(assetStatusHistory.assetId, id))
      .all()
      .map((item) => ({
        type: 'STATUS',
        occurredAt: item.occurredAt,
        data: item,
      }));
    const maintenanceEvents = this.db
      .select()
      .from(assetMaintenanceRecords)
      .where(
        and(
          eq(assetMaintenanceRecords.assetId, id),
          eq(assetMaintenanceRecords.userId, userId),
        ),
      )
      .all()
      .map((item) => ({
        type: 'MAINTENANCE',
        occurredAt: item.maintenanceDate,
        data: item,
      }));
    const profileEvents = this.db
      .select()
      .from(assetDepreciationProfiles)
      .where(eq(assetDepreciationProfiles.assetId, id))
      .all()
      .map((item) => ({
        type: 'DEPRECIATION_PROFILE',
        occurredAt: item.effectiveFrom,
        data: item,
      }));
    const attachmentEvents = this.db
      .select({
        id: assetAttachments.id,
        fileName: assetAttachments.fileName,
        type: assetAttachments.type,
        createdAt: assetAttachments.createdAt,
      })
      .from(assetAttachments)
      .where(
        and(
          eq(assetAttachments.assetId, id),
          eq(assetAttachments.userId, userId),
        ),
      )
      .all()
      .map((item) => ({
        type: 'ATTACHMENT',
        occurredAt: item.createdAt,
        data: item,
      }));
    return [
      ...statusEvents,
      ...maintenanceEvents,
      ...profileEvents,
      ...attachmentEvents,
    ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }

  getStatusHistory(userId: string, id: string) {
    this.requireOwned(userId, id);
    return this.db
      .select()
      .from(assetStatusHistory)
      .where(eq(assetStatusHistory.assetId, id))
      .orderBy(desc(assetStatusHistory.occurredAt))
      .all();
  }

  requireOwned(userId: string, id: string): AssetRecord {
    const asset = this.db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.userId, userId)))
      .get();
    if (!asset) throw new NotFoundException('资产不存在');
    return asset;
  }

  calculateValue(asset: AssetRecord, asOfDate: string): DepreciationResult {
    const profileRows = this.db
      .select()
      .from(assetDepreciationProfiles)
      .where(eq(assetDepreciationProfiles.assetId, asset.id))
      .orderBy(asc(assetDepreciationProfiles.version))
      .all();
    if (profileRows.length) {
      return calculateAssetValueByProfiles(
        profileRows.map((profile) => ({
          id: profile.id,
          assetId: profile.assetId,
          version: profile.version,
          effectiveFrom: profile.effectiveFrom,
          originalCostCents: profile.originalCostCents,
          residualValueCents: profile.residualValueCents,
          depreciationMethod: profile.depreciationMethod,
          createdAt: profile.createdAt,
          ...(profile.usefulLifeMonths === null
            ? {}
            : { usefulLifeMonths: profile.usefulLifeMonths }),
          ...(profile.customAnnualDepreciationRate === null
            ? {}
            : {
                customAnnualDepreciationRate:
                  profile.customAnnualDepreciationRate,
              }),
          ...(profile.customScheduleJson === null
            ? {}
            : { customScheduleJson: profile.customScheduleJson }),
        })),
        asOfDate,
      );
    }
    return calculateDepreciation({
      originalCostCents: asset.purchasePriceCents ?? 0,
      residualValueCents: asset.residualValueCents ?? 0,
      startDate:
        asset.depreciationStartDate ??
        asset.purchaseDate ??
        asset.createdAt.slice(0, 10),
      method: asset.depreciationMethod,
      asOfDate,
      ...(asset.usefulLifeMonths === null
        ? {}
        : { usefulLifeMonths: asset.usefulLifeMonths }),
      ...(asset.customAnnualDepreciationRate === null
        ? {}
        : { customAnnualDepreciationRate: asset.customAnnualDepreciationRate }),
    });
  }

  private buildListConditions(userId: string, query: AssetListQueryDto): SQL[] {
    const conditions: SQL[] = [eq(assets.userId, userId)];
    if (!query.includeArchived) conditions.push(isNull(assets.archivedAt));
    if (query.keyword) {
      const pattern = `%${query.keyword.trim()}%`;
      const keywordCondition = or(
        like(assets.name, pattern),
        like(assets.brand, pattern),
        like(assets.model, pattern),
        like(assets.serialNumber, pattern),
      );
      if (keywordCondition) conditions.push(keywordCondition);
    }
    if (query.categoryId)
      conditions.push(eq(assets.categoryId, query.categoryId));
    if (query.status) conditions.push(eq(assets.status, query.status));
    if (query.minPurchasePriceCents !== undefined) {
      conditions.push(
        gte(assets.purchasePriceCents, query.minPurchasePriceCents),
      );
    }
    if (query.maxPurchasePriceCents !== undefined) {
      conditions.push(
        lte(assets.purchasePriceCents, query.maxPurchasePriceCents),
      );
    }
    if (query.purchaseDateFrom)
      conditions.push(gte(assets.purchaseDate, query.purchaseDateFrom));
    if (query.purchaseDateTo)
      conditions.push(lte(assets.purchaseDate, query.purchaseDateTo));
    if (query.tagIds?.length) {
      const taggedAssets = this.db
        .select({ assetId: assetTagRelations.assetId })
        .from(assetTagRelations)
        .where(inArray(assetTagRelations.tagId, query.tagIds))
        .groupBy(assetTagRelations.assetId)
        .having(
          sql`count(distinct ${assetTagRelations.tagId}) >= ${query.tagIds.length}`,
        );
      conditions.push(inArray(assets.id, taggedAssets));
    }
    return conditions;
  }

  private getTagsByAssetIds(assetIds: string[]) {
    const result = new Map<string, Array<typeof assetTags.$inferSelect>>();
    if (!assetIds.length) return result;
    const rows = this.db
      .select({ assetId: assetTagRelations.assetId, tag: assetTags })
      .from(assetTagRelations)
      .innerJoin(assetTags, eq(assetTagRelations.tagId, assetTags.id))
      .where(inArray(assetTagRelations.assetId, assetIds))
      .all();
    for (const row of rows) {
      const tags = result.get(row.assetId) ?? [];
      tags.push(row.tag);
      result.set(row.assetId, tags);
    }
    return result;
  }

  private validateRelations(
    userId: string,
    categoryId: string | undefined,
    tagIds: string[] | undefined,
  ): void {
    if (categoryId) {
      const category = this.db
        .select({ id: assetCategories.id })
        .from(assetCategories)
        .where(
          and(
            eq(assetCategories.id, categoryId),
            eq(assetCategories.userId, userId),
          ),
        )
        .get();
      if (!category)
        throw new BadRequestException('分类不存在或不属于当前用户');
    }
    if (tagIds?.length) {
      if (new Set(tagIds).size !== tagIds.length) {
        throw new BadRequestException('标签不能重复');
      }
      const owned = this.db
        .select({ id: assetTags.id })
        .from(assetTags)
        .where(and(eq(assetTags.userId, userId), inArray(assetTags.id, tagIds)))
        .all();
      if (owned.length !== tagIds.length) {
        throw new BadRequestException('部分标签不存在或不属于当前用户');
      }
    }
  }

  private validateDepreciationFields(dto: Partial<CreateAssetDto>): void {
    const original = dto.purchasePriceCents;
    const residual = dto.residualValueCents ?? 0;
    if (original !== undefined && residual > original) {
      throw new BadRequestException('残值不得高于购置成本');
    }
    const method = dto.depreciationMethod ?? DepreciationMethod.NONE;
    if (method !== DepreciationMethod.NONE && original === undefined) {
      throw new BadRequestException('启用折旧时必须设置购置成本');
    }
    if (
      [
        DepreciationMethod.STRAIGHT_LINE,
        DepreciationMethod.DOUBLE_DECLINING,
      ].includes(method) &&
      !dto.usefulLifeMonths
    ) {
      throw new BadRequestException('该折旧方式必须设置使用年限');
    }
    if (
      method === DepreciationMethod.CUSTOM_ANNUAL_RATE &&
      !dto.customAnnualDepreciationRate
    ) {
      throw new BadRequestException('自定义年折旧率不能为空');
    }
    if (
      method === DepreciationMethod.CUSTOM_SCHEDULE &&
      !dto.customSchedule?.length
    ) {
      throw new BadRequestException('自定义月度计划不能为空');
    }
  }

  private toInsertValues(
    id: string,
    userId: string,
    dto: CreateAssetDto,
    now: string,
    status: AssetStatus,
    method: DepreciationMethod,
  ): typeof assets.$inferInsert {
    return {
      id,
      userId,
      name: dto.name.trim(),
      status,
      depreciationMethod: method,
      createdAt: now,
      updatedAt: now,
      ...this.toUpdateValues(dto),
    };
  }

  private toUpdateValues(
    dto: UpdateAssetDto,
  ): Partial<typeof assets.$inferInsert> {
    return {
      ...(dto.categoryId === undefined ? {} : { categoryId: dto.categoryId }),
      ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
      ...(dto.brand === undefined ? {} : { brand: dto.brand }),
      ...(dto.model === undefined ? {} : { model: dto.model }),
      ...(dto.serialNumber === undefined
        ? {}
        : { serialNumber: dto.serialNumber }),
      ...(dto.description === undefined
        ? {}
        : { description: dto.description }),
      ...(dto.purchaseDate === undefined
        ? {}
        : { purchaseDate: dto.purchaseDate }),
      ...(dto.purchasePriceCents === undefined
        ? {}
        : { purchasePriceCents: dto.purchasePriceCents }),
      ...(dto.purchaseChannel === undefined
        ? {}
        : { purchaseChannel: dto.purchaseChannel }),
      ...(dto.invoiceNumber === undefined
        ? {}
        : { invoiceNumber: dto.invoiceNumber }),
      ...(dto.residualValueCents === undefined
        ? {}
        : { residualValueCents: dto.residualValueCents }),
      ...(dto.usefulLifeMonths === undefined
        ? {}
        : { usefulLifeMonths: dto.usefulLifeMonths }),
      ...(dto.depreciationMethod === undefined
        ? {}
        : { depreciationMethod: dto.depreciationMethod }),
      ...(dto.customAnnualDepreciationRate === undefined
        ? {}
        : { customAnnualDepreciationRate: dto.customAnnualDepreciationRate }),
      ...(dto.depreciationStartDate === undefined
        ? {}
        : { depreciationStartDate: dto.depreciationStartDate }),
      ...(dto.currentMarketValueCents === undefined
        ? {}
        : { currentMarketValueCents: dto.currentMarketValueCents }),
      ...(dto.status === undefined ? {} : { status: dto.status }),
      ...(dto.location === undefined ? {} : { location: dto.location }),
      ...(dto.ownerName === undefined ? {} : { ownerName: dto.ownerName }),
    };
  }
}
