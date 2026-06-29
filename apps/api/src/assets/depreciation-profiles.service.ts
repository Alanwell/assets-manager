import {
  calculateDepreciation,
  DepreciationError,
} from '@asset-manager/depreciation';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { asc, desc, eq } from 'drizzle-orm';
import { isUniqueConstraintError } from '../common/database/sqlite-error';
import { DATABASE } from '../database/database.constants';
import type { AppDatabase } from '../database/database.types';
import { assetDepreciationProfiles, assets } from '../database/schema';
import { AssetsService } from './assets.service';
import type { CreateDepreciationProfileDto } from './depreciation-profiles.dto';

@Injectable()
export class DepreciationProfilesService {
  constructor(
    @Inject(DATABASE) private readonly db: AppDatabase,
    private readonly assetsService: AssetsService,
  ) {}

  list(userId: string, assetId: string) {
    this.assetsService.requireOwned(userId, assetId);
    return this.db
      .select()
      .from(assetDepreciationProfiles)
      .where(eq(assetDepreciationProfiles.assetId, assetId))
      .orderBy(asc(assetDepreciationProfiles.version))
      .all();
  }

  create(userId: string, assetId: string, dto: CreateDepreciationProfileDto) {
    const asset = this.assetsService.requireOwned(userId, assetId);
    if (dto.residualValueCents > dto.originalCostCents) {
      throw new BadRequestException('残值不得高于原值');
    }
    const latest = this.db
      .select()
      .from(assetDepreciationProfiles)
      .where(eq(assetDepreciationProfiles.assetId, assetId))
      .orderBy(desc(assetDepreciationProfiles.version))
      .limit(1)
      .get();
    if (latest && latest.originalCostCents !== dto.originalCostCents) {
      throw new BadRequestException('折旧快照必须保持原值一致');
    }
    try {
      calculateDepreciation({
        originalCostCents: dto.originalCostCents,
        residualValueCents: dto.residualValueCents,
        startDate: dto.effectiveFrom,
        asOfDate: dto.effectiveFrom,
        method: dto.depreciationMethod,
        ...(dto.usefulLifeMonths === undefined
          ? {}
          : { usefulLifeMonths: dto.usefulLifeMonths }),
        ...(dto.customAnnualDepreciationRate === undefined
          ? {}
          : { customAnnualDepreciationRate: dto.customAnnualDepreciationRate }),
        ...(dto.customSchedule === undefined
          ? {}
          : { customSchedule: dto.customSchedule }),
      });
    } catch (error) {
      if (error instanceof DepreciationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
    const now = new Date().toISOString();
    try {
      return this.db.transaction((tx) => {
        const profile = tx
          .insert(assetDepreciationProfiles)
          .values({
            id: randomUUID(),
            assetId,
            version: (latest?.version ?? 0) + 1,
            effectiveFrom: dto.effectiveFrom,
            originalCostCents: dto.originalCostCents,
            residualValueCents: dto.residualValueCents,
            depreciationMethod: dto.depreciationMethod,
            ...(dto.usefulLifeMonths === undefined
              ? {}
              : { usefulLifeMonths: dto.usefulLifeMonths }),
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
          .returning()
          .get();
        tx.update(assets)
          .set({
            residualValueCents: dto.residualValueCents,
            usefulLifeMonths: dto.usefulLifeMonths ?? null,
            depreciationMethod: dto.depreciationMethod,
            customAnnualDepreciationRate:
              dto.customAnnualDepreciationRate ?? null,
            depreciationStartDate: dto.effectiveFrom,
            updatedAt: now,
          })
          .where(eq(assets.id, asset.id))
          .run();
        return profile;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('折旧快照版本冲突，请重试');
      }
      throw error;
    }
  }
}
