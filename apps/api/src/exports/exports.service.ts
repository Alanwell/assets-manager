import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { AssetsService } from '../assets/assets.service';
import { DATABASE } from '../database/database.constants';
import type { AppDatabase } from '../database/database.types';
import { assetCategories, assets } from '../database/schema';

@Injectable()
export class ExportsService {
  constructor(
    @Inject(DATABASE) private readonly db: AppDatabase,
    private readonly assetsService: AssetsService,
  ) {}

  assetsCsv(userId: string): string {
    const rows = this.db
      .select({ asset: assets, category: assetCategories })
      .from(assets)
      .leftJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
      .where(and(eq(assets.userId, userId), isNull(assets.archivedAt)))
      .orderBy(asc(assets.name))
      .all();
    const today = new Date().toISOString().slice(0, 10);
    const header = [
      'ID',
      '名称',
      '分类',
      '品牌',
      '型号',
      '购买日期',
      '购置成本（分）',
      '当前账面价值（分）',
      '当前市场估值（分）',
      '状态',
      '位置',
    ];
    const body = rows.map(({ asset, category }) => {
      const value = this.assetsService.calculateValue(asset, today);
      return [
        asset.id,
        asset.name,
        category?.name ?? '',
        asset.brand ?? '',
        asset.model ?? '',
        asset.purchaseDate ?? '',
        asset.purchasePriceCents ?? '',
        value.currentBookValueCents,
        asset.currentMarketValueCents ?? '',
        asset.status,
        asset.location ?? '',
      ];
    });
    return `\uFEFF${[header, ...body]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n')}\r\n`;
  }
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
