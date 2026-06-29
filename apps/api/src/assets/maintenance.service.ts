import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { DATABASE } from '../database/database.constants';
import type { AppDatabase } from '../database/database.types';
import { assetMaintenanceRecords } from '../database/schema';
import { AssetsService } from './assets.service';
import type {
  CreateMaintenanceRecordDto,
  UpdateMaintenanceRecordDto,
} from './maintenance.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    @Inject(DATABASE) private readonly db: AppDatabase,
    private readonly assetsService: AssetsService,
  ) {}

  list(userId: string, assetId: string) {
    this.assetsService.requireOwned(userId, assetId);
    return this.db
      .select()
      .from(assetMaintenanceRecords)
      .where(
        and(
          eq(assetMaintenanceRecords.assetId, assetId),
          eq(assetMaintenanceRecords.userId, userId),
        ),
      )
      .orderBy(desc(assetMaintenanceRecords.maintenanceDate))
      .all();
  }

  create(userId: string, assetId: string, dto: CreateMaintenanceRecordDto) {
    this.assetsService.requireOwned(userId, assetId);
    const now = new Date().toISOString();
    return this.db
      .insert(assetMaintenanceRecords)
      .values({
        id: randomUUID(),
        assetId,
        userId,
        maintenanceDate: dto.maintenanceDate,
        type: dto.type,
        ...(dto.costCents === undefined ? {} : { costCents: dto.costCents }),
        ...(dto.description === undefined
          ? {}
          : { description: dto.description }),
        ...(dto.serviceProvider === undefined
          ? {}
          : { serviceProvider: dto.serviceProvider }),
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
  }

  update(
    userId: string,
    assetId: string,
    recordId: string,
    dto: UpdateMaintenanceRecordDto,
  ) {
    this.assetsService.requireOwned(userId, assetId);
    this.requireOwnedRecord(userId, assetId, recordId);
    return this.db
      .update(assetMaintenanceRecords)
      .set({
        ...(dto.maintenanceDate === undefined
          ? {}
          : { maintenanceDate: dto.maintenanceDate }),
        ...(dto.type === undefined ? {} : { type: dto.type }),
        ...(dto.costCents === undefined ? {} : { costCents: dto.costCents }),
        ...(dto.description === undefined
          ? {}
          : { description: dto.description }),
        ...(dto.serviceProvider === undefined
          ? {}
          : { serviceProvider: dto.serviceProvider }),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(assetMaintenanceRecords.id, recordId),
          eq(assetMaintenanceRecords.assetId, assetId),
          eq(assetMaintenanceRecords.userId, userId),
        ),
      )
      .returning()
      .get();
  }

  delete(userId: string, assetId: string, recordId: string): void {
    this.assetsService.requireOwned(userId, assetId);
    this.requireOwnedRecord(userId, assetId, recordId);
    this.db
      .delete(assetMaintenanceRecords)
      .where(
        and(
          eq(assetMaintenanceRecords.id, recordId),
          eq(assetMaintenanceRecords.assetId, assetId),
          eq(assetMaintenanceRecords.userId, userId),
        ),
      )
      .run();
  }

  private requireOwnedRecord(
    userId: string,
    assetId: string,
    recordId: string,
  ) {
    const record = this.db
      .select()
      .from(assetMaintenanceRecords)
      .where(
        and(
          eq(assetMaintenanceRecords.id, recordId),
          eq(assetMaintenanceRecords.assetId, assetId),
          eq(assetMaintenanceRecords.userId, userId),
        ),
      )
      .get();
    if (!record) throw new NotFoundException('维修记录不存在');
    return record;
  }
}
