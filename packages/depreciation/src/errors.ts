export type DepreciationErrorCode =
  | 'INVALID_AMOUNT'
  | 'INVALID_DATE'
  | 'INVALID_USEFUL_LIFE'
  | 'INVALID_ANNUAL_RATE'
  | 'INVALID_CUSTOM_SCHEDULE'
  | 'INVALID_PROFILE';

export class DepreciationError extends Error {
  constructor(
    public readonly code: DepreciationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DepreciationError';
  }
}
