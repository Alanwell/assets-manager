import { DepreciationError } from './errors.js';

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?=$|T)/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

export function parseCalendarDate(value: string): CalendarDate {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    throw new DepreciationError('INVALID_DATE', `无效日期：${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new DepreciationError('INVALID_DATE', `无效日期：${value}`);
  }
  return { year, month, day };
}

export function toDateKey(value: string): string {
  const date = parseCalendarDate(value);
  return `${date.year.toString().padStart(4, '0')}-${date.month
    .toString()
    .padStart(2, '0')}-${date.day.toString().padStart(2, '0')}`;
}

export function toMonthKey(value: string): string {
  const date = parseCalendarDate(value);
  return formatMonth(date.year, date.month);
}

export function parseMonthKey(value: string): { year: number; month: number } {
  const match = MONTH_PATTERN.exec(value);
  if (!match) {
    throw new DepreciationError('INVALID_DATE', `无效月份：${value}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new DepreciationError('INVALID_DATE', `无效月份：${value}`);
  }
  return { year, month };
}

export function compareDates(left: string, right: string): number {
  return toDateKey(left).localeCompare(toDateKey(right));
}

export function elapsedCalendarMonths(
  startDate: string,
  asOfDate: string,
): number {
  const start = parseCalendarDate(startDate);
  const end = parseCalendarDate(asOfDate);
  return Math.max(0, (end.year - start.year) * 12 + end.month - start.month);
}

export function addMonthsToDateMonth(
  dateValue: string,
  months: number,
): string {
  const date = parseCalendarDate(dateValue);
  const absoluteMonth = date.year * 12 + date.month - 1 + months;
  return formatMonth(Math.floor(absoluteMonth / 12), (absoluteMonth % 12) + 1);
}

export function previousMonthStart(dateValue: string): string {
  return `${addMonthsToDateMonth(dateValue, -1)}-01`;
}

export function previousMonthEnd(dateValue: string): string {
  const date = parseCalendarDate(dateValue);
  const end = new Date(Date.UTC(date.year, date.month - 1, 0));
  return `${end.getUTCFullYear().toString().padStart(4, '0')}-${(
    end.getUTCMonth() + 1
  )
    .toString()
    .padStart(2, '0')}-${end.getUTCDate().toString().padStart(2, '0')}`;
}

function formatMonth(year: number, month: number): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}`;
}
