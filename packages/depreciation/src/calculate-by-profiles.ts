import type { AssetDepreciationProfile } from '@asset-manager/domain';
import { calculateDepreciation } from './calculate-depreciation.js';
import {
  compareDates,
  previousMonthEnd,
  previousMonthStart,
  toDateKey,
  toMonthKey,
} from './date-utils.js';
import { DepreciationError } from './errors.js';
import type {
  CustomScheduleItem,
  DepreciationResult,
  DepreciationScheduleItem,
} from './types.js';

export function calculateAssetValueByProfiles(
  profiles: AssetDepreciationProfile[],
  asOfDate: string,
): DepreciationResult {
  if (profiles.length === 0) {
    throw new DepreciationError('INVALID_PROFILE', '至少需要一个折旧规则快照');
  }
  toDateKey(asOfDate);
  const ordered = normalizeProfiles(profiles);
  const first = ordered[0];
  if (!first) {
    throw new DepreciationError('INVALID_PROFILE', '至少需要一个折旧规则快照');
  }
  const active = ordered.filter(
    (profile) => compareDates(profile.effectiveFrom, asOfDate) <= 0,
  );
  if (active.length === 0) {
    return calculateProfile(
      first,
      first.originalCostCents,
      asOfDate,
      first.effectiveFrom,
    );
  }

  let bookValue = first.originalCostCents;
  let accumulated = 0;
  let monthlyDepreciationCents: number | undefined;
  const schedule: DepreciationScheduleItem[] = [];
  for (const [index, profile] of active.entries()) {
    if (profile.originalCostCents !== first.originalCostCents) {
      throw new DepreciationError(
        'INVALID_PROFILE',
        '同一资产的折旧快照必须保持原值一致',
      );
    }
    if (profile.residualValueCents > bookValue) {
      throw new DepreciationError(
        'INVALID_PROFILE',
        '新折旧规则的残值不得高于生效时账面价值',
      );
    }
    const next = active[index + 1];
    const segmentEnd = next ? previousMonthEnd(next.effectiveFrom) : asOfDate;
    const segmentStart =
      index === 0
        ? profile.effectiveFrom
        : previousMonthStart(profile.effectiveFrom);
    const segment = calculateProfile(
      profile,
      bookValue,
      segmentEnd,
      segmentStart,
    );
    for (const item of segment.schedule) {
      accumulated += item.depreciationCents;
      schedule.push({ ...item, accumulatedDepreciationCents: accumulated });
    }
    bookValue = segment.currentBookValueCents;
    monthlyDepreciationCents = segment.monthlyDepreciationCents;
  }
  const currentProfile = active.at(-1) ?? first;
  return {
    originalCostCents: first.originalCostCents,
    residualValueCents: currentProfile.residualValueCents,
    accumulatedDepreciationCents: accumulated,
    currentBookValueCents: bookValue,
    ...(monthlyDepreciationCents === undefined
      ? {}
      : { monthlyDepreciationCents }),
    schedule,
  };
}

function calculateProfile(
  profile: AssetDepreciationProfile,
  openingBookValueCents: number,
  asOfDate: string,
  startDate: string,
): DepreciationResult {
  return calculateDepreciation({
    originalCostCents: openingBookValueCents,
    residualValueCents: profile.residualValueCents,
    startDate,
    method: profile.depreciationMethod,
    asOfDate,
    ...(profile.usefulLifeMonths === undefined
      ? {}
      : { usefulLifeMonths: profile.usefulLifeMonths }),
    ...(profile.customAnnualDepreciationRate === undefined
      ? {}
      : { customAnnualDepreciationRate: profile.customAnnualDepreciationRate }),
    ...(profile.customScheduleJson === undefined
      ? {}
      : {
          customSchedule: parseCustomSchedule(
            profile.customScheduleJson,
          ).filter((item) => item.month >= toMonthKey(profile.effectiveFrom)),
        }),
  });
}

function normalizeProfiles(
  profiles: AssetDepreciationProfile[],
): AssetDepreciationProfile[] {
  const assetId = profiles[0]?.assetId;
  const versions = new Set<number>();
  const sorted = [...profiles].sort((left, right) => {
    const dateComparison = toDateKey(left.effectiveFrom).localeCompare(
      toDateKey(right.effectiveFrom),
    );
    return dateComparison || left.version - right.version;
  });
  for (const profile of sorted) {
    if (profile.assetId !== assetId) {
      throw new DepreciationError(
        'INVALID_PROFILE',
        '不能混合计算不同资产的折旧快照',
      );
    }
    if (!Number.isSafeInteger(profile.version) || profile.version <= 0) {
      throw new DepreciationError('INVALID_PROFILE', '快照版本必须是正整数');
    }
    if (versions.has(profile.version)) {
      throw new DepreciationError('INVALID_PROFILE', '快照版本号不得重复');
    }
    versions.add(profile.version);
  }
  for (let index = 1; index < sorted.length; index += 1) {
    if ((sorted[index]?.version ?? 0) <= (sorted[index - 1]?.version ?? 0)) {
      throw new DepreciationError(
        'INVALID_PROFILE',
        '快照版本必须随生效时间递增',
      );
    }
  }
  const byEffectiveDate = new Map<string, AssetDepreciationProfile>();
  for (const profile of sorted) {
    byEffectiveDate.set(toDateKey(profile.effectiveFrom), profile);
  }
  return [...byEffectiveDate.values()];
}

function parseCustomSchedule(json: string): CustomScheduleItem[] {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new DepreciationError(
      'INVALID_CUSTOM_SCHEDULE',
      '自定义计划 JSON 无效',
    );
  }
  if (!Array.isArray(value)) {
    throw new DepreciationError(
      'INVALID_CUSTOM_SCHEDULE',
      '自定义计划必须是数组',
    );
  }
  return value.map((item) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('month' in item) ||
      !('depreciationCents' in item) ||
      typeof item.month !== 'string' ||
      typeof item.depreciationCents !== 'number'
    ) {
      throw new DepreciationError(
        'INVALID_CUSTOM_SCHEDULE',
        '自定义计划项目格式无效',
      );
    }
    return { month: item.month, depreciationCents: item.depreciationCents };
  });
}
