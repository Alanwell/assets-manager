export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    String(error.code).startsWith('SQLITE_CONSTRAINT_UNIQUE')
  );
}
