import { DepreciationMethod } from '@asset-manager/domain';
import { calculateDepreciation } from '@asset-manager/depreciation';

export function createDepreciationPreview(asOfDate: string) {
  return calculateDepreciation({
    originalCostCents: 1_200_000,
    residualValueCents: 120_000,
    startDate: '2025-01-01',
    usefulLifeMonths: 36,
    method: DepreciationMethod.STRAIGHT_LINE,
    asOfDate,
  });
}
