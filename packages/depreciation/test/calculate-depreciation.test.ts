import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DepreciationMethod,
  type AssetDepreciationProfile,
} from '@asset-manager/domain';
import {
  calculateAssetValueByProfiles,
  calculateDepreciation,
  DepreciationError,
} from '../src/index.js';

describe('calculateDepreciation', () => {
  it('NONE 不产生折旧', () => {
    const result = calculateDepreciation({
      originalCostCents: 100_000,
      residualValueCents: 10_000,
      startDate: '2025-01-15',
      asOfDate: '2026-01-15',
      method: DepreciationMethod.NONE,
    });
    assert.equal(result.currentBookValueCents, 100_000);
    assert.equal(result.accumulatedDepreciationCents, 0);
    assert.deepEqual(result.schedule, []);
  });

  it('起算日期在未来时折旧为零', () => {
    const result = calculateDepreciation({
      originalCostCents: 100_000,
      residualValueCents: 10_000,
      usefulLifeMonths: 9,
      startDate: '2026-02-01',
      asOfDate: '2026-01-31',
      method: DepreciationMethod.STRAIGHT_LINE,
    });
    assert.equal(result.accumulatedDepreciationCents, 0);
  });

  it('直线法按自然月计提，起算月不计提', () => {
    const inStartMonth = calculateDepreciation({
      originalCostCents: 10_000,
      residualValueCents: 1_000,
      usefulLifeMonths: 3,
      startDate: '2025-01-15',
      asOfDate: '2025-01-31',
      method: DepreciationMethod.STRAIGHT_LINE,
    });
    const nextMonth = calculateDepreciation({
      originalCostCents: 10_000,
      residualValueCents: 1_000,
      usefulLifeMonths: 3,
      startDate: '2025-01-15',
      asOfDate: '2025-02-01',
      method: DepreciationMethod.STRAIGHT_LINE,
    });
    assert.equal(inStartMonth.accumulatedDepreciationCents, 0);
    assert.equal(nextMonth.accumulatedDepreciationCents, 3_000);
    assert.equal(nextMonth.schedule[0]?.month, '2025-02');
  });

  it('直线法统一分配舍入余数并最终停在残值', () => {
    const result = calculateDepreciation({
      originalCostCents: 101,
      residualValueCents: 1,
      usefulLifeMonths: 3,
      startDate: '2025-01-01',
      asOfDate: '2025-12-31',
      method: DepreciationMethod.STRAIGHT_LINE,
    });
    assert.deepEqual(
      result.schedule.map((item) => item.depreciationCents),
      [34, 33, 33],
    );
    assert.equal(result.currentBookValueCents, 1);
    assert.equal(result.accumulatedDepreciationCents, 100);
  });

  it('双倍余额递减法在残值处截断', () => {
    const result = calculateDepreciation({
      originalCostCents: 100_000,
      residualValueCents: 90_000,
      usefulLifeMonths: 12,
      startDate: '2025-01-01',
      asOfDate: '2025-02-01',
      method: DepreciationMethod.DOUBLE_DECLINING,
    });
    assert.equal(result.schedule[0]?.depreciationCents, 10_000);
    assert.equal(result.currentBookValueCents, 90_000);
  });

  it('自定义年折旧率产生固定月折旧额', () => {
    const result = calculateDepreciation({
      originalCostCents: 120_000,
      residualValueCents: 0,
      startDate: '2025-01-01',
      asOfDate: '2025-07-01',
      method: DepreciationMethod.CUSTOM_ANNUAL_RATE,
      customAnnualDepreciationRate: 20,
    });
    assert.equal(result.monthlyDepreciationCents, 2_000);
    assert.equal(result.accumulatedDepreciationCents, 12_000);
  });

  it('自定义计划总额超限时在残值处截断', () => {
    const result = calculateDepreciation({
      originalCostCents: 10_000,
      residualValueCents: 3_000,
      startDate: '2025-01-01',
      asOfDate: '2025-03-31',
      method: DepreciationMethod.CUSTOM_SCHEDULE,
      customSchedule: [
        { month: '2025-02', depreciationCents: 5_000 },
        { month: '2025-03', depreciationCents: 5_000 },
      ],
    });
    assert.deepEqual(
      result.schedule.map((item) => item.depreciationCents),
      [5_000, 2_000],
    );
    assert.equal(result.currentBookValueCents, 3_000);
    assert.equal(result.monthlyDepreciationCents, 2_000);
  });

  it('拒绝残值高于原值和重复的自定义月份', () => {
    assert.throws(
      () =>
        calculateDepreciation({
          originalCostCents: 1_000,
          residualValueCents: 1_001,
          startDate: '2025-01-01',
          asOfDate: '2025-02-01',
          method: DepreciationMethod.NONE,
        }),
      DepreciationError,
    );
    assert.throws(
      () =>
        calculateDepreciation({
          originalCostCents: 1_000,
          residualValueCents: 0,
          startDate: '2025-01-01',
          asOfDate: '2025-02-01',
          method: DepreciationMethod.CUSTOM_SCHEDULE,
          customSchedule: [
            { month: '2025-02', depreciationCents: 100 },
            { month: '2025-02', depreciationCents: 100 },
          ],
        }),
      DepreciationError,
    );
  });
});

describe('calculateAssetValueByProfiles', () => {
  it('按 effectiveFrom 和 version 连续计算多个规则快照', () => {
    const profiles: AssetDepreciationProfile[] = [
      profile({
        id: 'profile-2',
        version: 2,
        effectiveFrom: '2025-04-01',
        usefulLifeMonths: 10,
      }),
      profile({
        id: 'profile-1',
        version: 1,
        effectiveFrom: '2025-01-01',
        usefulLifeMonths: 12,
      }),
    ];
    const result = calculateAssetValueByProfiles(profiles, '2025-06-30');
    assert.deepEqual(
      result.schedule.map((item) => item.month),
      ['2025-02', '2025-03', '2025-04', '2025-05', '2025-06'],
    );
    assert.equal(result.currentBookValueCents, 70_000);
    assert.equal(result.accumulatedDepreciationCents, 50_000);
  });

  it('修改为不折旧后保留历史账面价值', () => {
    const noDepreciationProfile = profile({
      id: 'profile-2',
      version: 2,
      effectiveFrom: '2025-04-01',
      depreciationMethod: DepreciationMethod.NONE,
    });
    delete noDepreciationProfile.usefulLifeMonths;
    const result = calculateAssetValueByProfiles(
      [
        profile({ version: 1, effectiveFrom: '2025-01-01' }),
        noDepreciationProfile,
      ],
      '2025-06-30',
    );
    assert.equal(result.currentBookValueCents, 100_000);
    assert.equal(result.accumulatedDepreciationCents, 20_000);
  });

  it('拒绝不递增的版本和高于当前账面价值的新残值', () => {
    assert.throws(
      () =>
        calculateAssetValueByProfiles(
          [
            profile({ version: 2, effectiveFrom: '2025-01-01' }),
            profile({ version: 1, effectiveFrom: '2025-04-01' }),
          ],
          '2025-06-01',
        ),
      DepreciationError,
    );
    assert.throws(
      () =>
        calculateAssetValueByProfiles(
          [
            profile({ version: 1, effectiveFrom: '2025-01-01' }),
            profile({
              version: 2,
              effectiveFrom: '2025-04-01',
              residualValueCents: 110_000,
            }),
          ],
          '2025-06-01',
        ),
      DepreciationError,
    );
  });
});

function profile(
  overrides: Partial<AssetDepreciationProfile>,
): AssetDepreciationProfile {
  return {
    id: 'profile-1',
    assetId: 'asset-1',
    version: 1,
    effectiveFrom: '2025-01-01',
    originalCostCents: 120_000,
    residualValueCents: 0,
    usefulLifeMonths: 12,
    depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}
