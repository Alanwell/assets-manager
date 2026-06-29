import type { DepreciationMethod } from '@asset-manager/domain';

export interface CustomScheduleItem {
  month: string;
  depreciationCents: number;
}

export interface DepreciationInput {
  originalCostCents: number;
  residualValueCents: number;
  startDate: string;
  usefulLifeMonths?: number;
  method: DepreciationMethod;
  customAnnualDepreciationRate?: number;
  customSchedule?: CustomScheduleItem[];
  asOfDate: string;
}

export interface DepreciationScheduleItem {
  month: string;
  openingBookValueCents: number;
  depreciationCents: number;
  accumulatedDepreciationCents: number;
  closingBookValueCents: number;
}

export interface DepreciationResult {
  originalCostCents: number;
  residualValueCents: number;
  accumulatedDepreciationCents: number;
  currentBookValueCents: number;
  monthlyDepreciationCents?: number;
  schedule: DepreciationScheduleItem[];
}
