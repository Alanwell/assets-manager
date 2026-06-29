import { DepreciationMethod } from '@asset-manager/domain';
import {
  addMonthsToDateMonth,
  compareDates,
  elapsedCalendarMonths,
  parseMonthKey,
  toMonthKey,
} from './date-utils.js';
import { DepreciationError } from './errors.js';
import type {
  CustomScheduleItem,
  DepreciationInput,
  DepreciationResult,
  DepreciationScheduleItem,
} from './types.js';

export function calculateDepreciation(
  input: DepreciationInput,
): DepreciationResult {
  validateBaseInput(input);
  if (
    compareDates(input.startDate, input.asOfDate) > 0 ||
    input.method === DepreciationMethod.NONE
  ) {
    return emptyResult(input.originalCostCents, input.residualValueCents);
  }

  switch (input.method) {
    case DepreciationMethod.STRAIGHT_LINE:
      return calculateStraightLine(input);
    case DepreciationMethod.DOUBLE_DECLINING:
      return calculateDoubleDeclining(input);
    case DepreciationMethod.CUSTOM_ANNUAL_RATE:
      return calculateCustomAnnualRate(input);
    case DepreciationMethod.CUSTOM_SCHEDULE:
      return calculateCustomSchedule(input);
    default:
      return assertNever(input.method);
  }
}

function calculateStraightLine(input: DepreciationInput): DepreciationResult {
  const usefulLifeMonths = requireUsefulLife(input.usefulLifeMonths);
  const depreciable = input.originalCostCents - input.residualValueCents;
  const elapsed = Math.min(
    elapsedCalendarMonths(input.startDate, input.asOfDate),
    usefulLifeMonths,
  );
  const base = Math.floor(depreciable / usefulLifeMonths);
  const remainder = depreciable % usefulLifeMonths;
  const amounts = Array.from(
    { length: elapsed },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
  return createResult(
    input,
    amounts.map((amount, index) => ({
      month: addMonthsToDateMonth(input.startDate, index + 1),
      depreciationCents: amount,
    })),
    roundRatio(BigInt(depreciable), BigInt(usefulLifeMonths)),
  );
}

function calculateDoubleDeclining(
  input: DepreciationInput,
): DepreciationResult {
  const usefulLifeMonths = requireUsefulLife(input.usefulLifeMonths);
  const elapsed = Math.min(
    elapsedCalendarMonths(input.startDate, input.asOfDate),
    usefulLifeMonths,
  );
  let bookValue = input.originalCostCents;
  const amounts: CustomScheduleItem[] = [];
  for (let index = 0; index < elapsed; index += 1) {
    const available = bookValue - input.residualValueCents;
    if (available <= 0) break;
    const calculated = roundRatio(
      BigInt(bookValue) * 2n,
      BigInt(usefulLifeMonths),
    );
    const depreciationCents = Math.min(calculated, available);
    amounts.push({
      month: addMonthsToDateMonth(input.startDate, index + 1),
      depreciationCents,
    });
    bookValue -= depreciationCents;
  }
  const monthly =
    amounts.length > 0 ? amounts[0]?.depreciationCents : undefined;
  return createResult(input, amounts, monthly);
}

function calculateCustomAnnualRate(
  input: DepreciationInput,
): DepreciationResult {
  const annualRate = input.customAnnualDepreciationRate;
  if (
    annualRate === undefined ||
    !Number.isFinite(annualRate) ||
    annualRate <= 0
  ) {
    throw new DepreciationError(
      'INVALID_ANNUAL_RATE',
      '自定义年折旧率必须是大于 0 的有限数值',
    );
  }
  const depreciable = input.originalCostCents - input.residualValueCents;
  const rateScale = 1_000_000;
  const scaledRate = Math.round(annualRate * rateScale);
  const monthly = roundRatio(
    BigInt(depreciable) * BigInt(scaledRate),
    BigInt(1200 * rateScale),
  );
  const elapsedMonths = elapsedCalendarMonths(input.startDate, input.asOfDate);
  const elapsed = input.usefulLifeMonths
    ? Math.min(elapsedMonths, requireUsefulLife(input.usefulLifeMonths))
    : elapsedMonths;
  const amounts = Array.from({ length: elapsed }, (_, index) => ({
    month: addMonthsToDateMonth(input.startDate, index + 1),
    depreciationCents: monthly,
  }));
  return createResult(input, amounts, monthly);
}

function calculateCustomSchedule(input: DepreciationInput): DepreciationResult {
  const customSchedule = input.customSchedule;
  if (!customSchedule) {
    throw new DepreciationError(
      'INVALID_CUSTOM_SCHEDULE',
      '自定义月度计划不能为空',
    );
  }
  const startMonth = toMonthKey(input.startDate);
  const asOfMonth = toMonthKey(input.asOfDate);
  const seen = new Set<string>();
  const selected = customSchedule
    .map((item) => {
      parseMonthKey(item.month);
      if (
        !Number.isSafeInteger(item.depreciationCents) ||
        item.depreciationCents < 0
      ) {
        throw new DepreciationError(
          'INVALID_CUSTOM_SCHEDULE',
          `月份 ${item.month} 的折旧金额必须是非负整数分`,
        );
      }
      if (seen.has(item.month)) {
        throw new DepreciationError(
          'INVALID_CUSTOM_SCHEDULE',
          `自定义计划存在重复月份：${item.month}`,
        );
      }
      seen.add(item.month);
      return item;
    })
    .filter((item) => item.month >= startMonth && item.month <= asOfMonth)
    .sort((left, right) => left.month.localeCompare(right.month));
  const currentMonthAmount = selected.find(
    (item) => item.month === asOfMonth,
  )?.depreciationCents;
  const result = createResult(input, selected);
  const actualCurrentMonthAmount = result.schedule.find(
    (item) => item.month === asOfMonth,
  )?.depreciationCents;
  return actualCurrentMonthAmount === undefined &&
    currentMonthAmount === undefined
    ? result
    : {
        ...result,
        monthlyDepreciationCents: actualCurrentMonthAmount ?? 0,
      };
}

function createResult(
  input: Pick<DepreciationInput, 'originalCostCents' | 'residualValueCents'>,
  amounts: CustomScheduleItem[],
  monthlyDepreciationCents?: number,
): DepreciationResult {
  let bookValue = input.originalCostCents;
  let accumulated = 0;
  const schedule: DepreciationScheduleItem[] = [];
  for (const item of amounts) {
    const available = bookValue - input.residualValueCents;
    if (available <= 0) break;
    const depreciationCents = Math.min(item.depreciationCents, available);
    const openingBookValueCents = bookValue;
    accumulated += depreciationCents;
    bookValue -= depreciationCents;
    schedule.push({
      month: item.month,
      openingBookValueCents,
      depreciationCents,
      accumulatedDepreciationCents: accumulated,
      closingBookValueCents: bookValue,
    });
  }
  return {
    originalCostCents: input.originalCostCents,
    residualValueCents: input.residualValueCents,
    accumulatedDepreciationCents: accumulated,
    currentBookValueCents: bookValue,
    ...(monthlyDepreciationCents === undefined
      ? {}
      : { monthlyDepreciationCents }),
    schedule,
  };
}

function validateBaseInput(input: DepreciationInput): void {
  for (const [name, value] of [
    ['originalCostCents', input.originalCostCents],
    ['residualValueCents', input.residualValueCents],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new DepreciationError('INVALID_AMOUNT', `${name} 必须是非负整数分`);
    }
  }
  if (input.residualValueCents > input.originalCostCents) {
    throw new DepreciationError('INVALID_AMOUNT', '残值不得高于原值');
  }
  compareDates(input.startDate, input.asOfDate);
}

function requireUsefulLife(value: number | undefined): number {
  if (!Number.isSafeInteger(value) || value === undefined || value <= 0) {
    throw new DepreciationError(
      'INVALID_USEFUL_LIFE',
      '使用年限必须是大于 0 的整数月',
    );
  }
  return value;
}

function emptyResult(
  originalCostCents: number,
  residualValueCents: number,
): DepreciationResult {
  return {
    originalCostCents,
    residualValueCents,
    accumulatedDepreciationCents: 0,
    currentBookValueCents: originalCostCents,
    schedule: [],
  };
}

function roundRatio(numerator: bigint, denominator: bigint): number {
  return Number((numerator + denominator / 2n) / denominator);
}

function assertNever(value: never): never {
  throw new DepreciationError(
    'INVALID_PROFILE',
    `不支持的折旧方式：${String(value)}`,
  );
}
