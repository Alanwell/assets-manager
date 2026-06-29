import {
  AssetStatus,
  AttachmentType,
  DepreciationMethod,
  MaintenanceType,
} from '@asset-manager/domain';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../common/security/password';
import { loadEnvironment } from '../config/load-environment';
import { createDatabaseConnection } from './database.connection';
import {
  assetAttachments,
  assetCategories,
  assetDepreciationProfiles,
  assetMaintenanceRecords,
  assets,
  assetStatusHistory,
  users,
} from './schema';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'AssetManager123!';
const now = '2026-01-01T00:00:00.000Z';

async function seed(): Promise<void> {
  loadEnvironment();
  const { client, db } = createDatabaseConnection();
  try {
    const existing = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, TEST_EMAIL))
      .get();
    if (existing) {
      console.info(`Seed user already exists: ${TEST_EMAIL}`);
    } else {
      const userId = randomUUID();
      const passwordHash = await hashPassword(TEST_PASSWORD);
      const categoryNames = [
        '数码电子',
        '家具家电',
        '摄影器材',
        '车辆交通',
        '房屋地产',
        '收藏品',
        '工具设备',
        '运动户外',
        '其他',
      ];
      const categoryRows = categoryNames.map((name, index) => ({
        id: randomUUID(),
        userId,
        name,
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      }));
      const examples = [
        [
          'MacBook Pro',
          15_999_00,
          AssetStatus.IN_USE,
          DepreciationMethod.STRAIGHT_LINE,
          36,
        ],
        [
          '客厅电视',
          6_999_00,
          AssetStatus.IN_USE,
          DepreciationMethod.DOUBLE_DECLINING,
          60,
        ],
        [
          '全画幅相机',
          18_500_00,
          AssetStatus.IDLE,
          DepreciationMethod.CUSTOM_ANNUAL_RATE,
          60,
        ],
        [
          '城市通勤车',
          3_200_00,
          AssetStatus.SOLD,
          DepreciationMethod.STRAIGHT_LINE,
          48,
        ],
        [
          '机械腕表',
          28_000_00,
          AssetStatus.IN_USE,
          DepreciationMethod.NONE,
          undefined,
        ],
        [
          '电动工具套装',
          2_400_00,
          AssetStatus.IN_USE,
          DepreciationMethod.CUSTOM_SCHEDULE,
          24,
        ],
        [
          '露营帐篷',
          1_899_00,
          AssetStatus.LOST,
          DepreciationMethod.STRAIGHT_LINE,
          36,
        ],
        [
          '扫地机器人',
          3_599_00,
          AssetStatus.SCRAPPED,
          DepreciationMethod.DOUBLE_DECLINING,
          36,
        ],
      ] as const;
      const assetRows = examples.map(
        ([name, price, status, method, life], index) => ({
          id: randomUUID(),
          userId,
          categoryId: categoryRows[index]?.id,
          name,
          purchaseDate: `2025-${(index + 1).toString().padStart(2, '0')}-01`,
          purchasePriceCents: price,
          residualValueCents: Math.round(price * 0.1),
          ...(life === undefined ? {} : { usefulLifeMonths: life }),
          depreciationMethod: method,
          ...(method === DepreciationMethod.CUSTOM_ANNUAL_RATE
            ? { customAnnualDepreciationRate: 20 }
            : {}),
          depreciationStartDate: `2025-${(index + 1).toString().padStart(2, '0')}-01`,
          currentMarketValueCents: Math.round(price * 0.8),
          status,
          createdAt: now,
          updatedAt: now,
          ...(status === AssetStatus.SOLD || status === AssetStatus.SCRAPPED
            ? { disposedAt: '2025-12-01T00:00:00.000Z' }
            : {}),
        }),
      );

      db.transaction((tx) => {
        tx.insert(users)
          .values({
            id: userId,
            email: TEST_EMAIL,
            passwordHash,
            displayName: '演示用户',
            createdAt: now,
            updatedAt: now,
          })
          .run();
        tx.insert(assetCategories).values(categoryRows).run();
        tx.insert(assets).values(assetRows).run();
        tx.insert(assetDepreciationProfiles)
          .values(
            assetRows.map((asset) => ({
              id: randomUUID(),
              assetId: asset.id,
              version: 1,
              effectiveFrom: asset.depreciationStartDate,
              originalCostCents: asset.purchasePriceCents,
              residualValueCents: asset.residualValueCents,
              ...(!('usefulLifeMonths' in asset)
                ? {}
                : { usefulLifeMonths: asset.usefulLifeMonths }),
              depreciationMethod: asset.depreciationMethod,
              ...(!('customAnnualDepreciationRate' in asset)
                ? {}
                : {
                    customAnnualDepreciationRate:
                      asset.customAnnualDepreciationRate,
                  }),
              ...(asset.depreciationMethod ===
              DepreciationMethod.CUSTOM_SCHEDULE
                ? {
                    customScheduleJson: JSON.stringify([
                      { month: '2025-08', depreciationCents: 10_000 },
                      { month: '2025-09', depreciationCents: 10_000 },
                    ]),
                  }
                : {}),
              createdAt: now,
            })),
          )
          .run();
        tx.insert(assetMaintenanceRecords)
          .values({
            id: randomUUID(),
            assetId: assetRows[0]!.id,
            userId,
            maintenanceDate: '2025-10-15',
            type: MaintenanceType.INSPECTION,
            costCents: 0,
            description: '年度设备检查',
            createdAt: now,
            updatedAt: now,
          })
          .run();
        tx.insert(assetAttachments)
          .values({
            id: randomUUID(),
            assetId: assetRows[0]!.id,
            userId,
            fileName: '示例发票.pdf',
            mimeType: 'application/pdf',
            fileSize: 1024,
            storagePath: `${userId}/${assetRows[0]!.id}/example.pdf`,
            type: AttachmentType.INVOICE,
            createdAt: now,
          })
          .run();
        tx.insert(assetStatusHistory)
          .values(
            assetRows.map((asset) => ({
              id: randomUUID(),
              assetId: asset.id,
              toStatus: asset.status,
              occurredAt: asset.createdAt,
              createdAt: now,
            })),
          )
          .run();
      });
      console.info(`Seed completed. Login: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
    }
  } finally {
    client.close();
  }
}

void seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
