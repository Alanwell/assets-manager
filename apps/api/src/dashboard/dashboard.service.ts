import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { DATABASE } from '../database/database.constants';
import type { AppDatabase } from '../database/database.types';
import { assetCategories, assets } from '../database/schema';
import { AssetsService } from '../assets/assets.service';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DATABASE) private readonly db: AppDatabase,
    private readonly assetsService: AssetsService,
  ) {}

  overview(userId: string) {
    const records = this.getAssets(userId);
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    let totalPurchaseCostCents = 0;
    let currentBookValueCents = 0;
    let accumulatedDepreciationCents = 0;
    let currentMarketValueCents = 0;
    let currentMonthDepreciationCents = 0;
    for (const asset of records) {
      const value = this.assetsService.calculateValue(asset, today);
      totalPurchaseCostCents += asset.purchasePriceCents ?? 0;
      currentBookValueCents += value.currentBookValueCents;
      accumulatedDepreciationCents += value.accumulatedDepreciationCents;
      currentMarketValueCents += asset.currentMarketValueCents ?? 0;
      currentMonthDepreciationCents +=
        value.schedule.find((item) => item.month === month)
          ?.depreciationCents ?? 0;
    }
    return {
      totalPurchaseCostCents,
      currentBookValueCents,
      accumulatedDepreciationCents,
      currentMarketValueCents,
      assetCount: records.length,
      currentMonthDepreciationCents,
    };
  }

  categoryDistribution(userId: string) {
    const rows = this.db
      .select({ asset: assets, category: assetCategories })
      .from(assets)
      .leftJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
      .where(and(eq(assets.userId, userId), isNull(assets.archivedAt)))
      .all();
    const today = new Date().toISOString().slice(0, 10);
    const grouped = new Map<
      string,
      {
        categoryId: string | null;
        name: string;
        valueCents: number;
        assetCount: number;
      }
    >();
    for (const row of rows) {
      const key = row.category?.id ?? 'uncategorized';
      const current = grouped.get(key) ?? {
        categoryId: row.category?.id ?? null,
        name: row.category?.name ?? '未分类',
        valueCents: 0,
        assetCount: 0,
      };
      current.valueCents += this.assetsService.calculateValue(
        row.asset,
        today,
      ).currentBookValueCents;
      current.assetCount += 1;
      grouped.set(key, current);
    }
    return [...grouped.values()].sort((a, b) => b.valueCents - a.valueCents);
  }

  statusDistribution(userId: string) {
    const rows = this.getAssets(userId);
    const counts = new Map<string, number>();
    for (const asset of rows)
      counts.set(asset.status, (counts.get(asset.status) ?? 0) + 1);
    return [...counts].map(([status, assetCount]) => ({ status, assetCount }));
  }

  depreciationTrend(userId: string) {
    const records = this.getAssets(userId);
    return lastTwelveMonths().map(({ month, asOfDate }) => ({
      month,
      depreciationCents: records.reduce((total, asset) => {
        const result = this.assetsService.calculateValue(asset, asOfDate);
        return (
          total +
          (result.schedule.find((item) => item.month === month)
            ?.depreciationCents ?? 0)
        );
      }, 0),
    }));
  }

  recentAssets(userId: string) {
    return this.db
      .select()
      .from(assets)
      .where(and(eq(assets.userId, userId), isNull(assets.archivedAt)))
      .orderBy(desc(assets.createdAt))
      .limit(10)
      .all();
  }

  private getAssets(userId: string) {
    return this.db
      .select()
      .from(assets)
      .where(and(eq(assets.userId, userId), isNull(assets.archivedAt)))
      .orderBy(asc(assets.createdAt))
      .all();
  }
}

function lastTwelveMonths(): Array<{ month: string; asOfDate: string }> {
  const now = new Date();
  return Array.from({ length: 12 }, (_, index) => {
    const offset = index - 11;
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 0),
    );
    const month = `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
    return { month, asOfDate: date.toISOString().slice(0, 10) };
  });
}
