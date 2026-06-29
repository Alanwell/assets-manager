import { Injectable } from '@nestjs/common';

@Injectable()
export class AppConfigService {
  readonly port = parseInteger(process.env.PORT, 3000);
  readonly jwtAccessSecret = requiredSecret(
    'JWT_ACCESS_SECRET',
    'local-access-secret-change-me',
  );
  readonly jwtRefreshSecret = requiredSecret(
    'JWT_REFRESH_SECRET',
    'local-refresh-secret-change-me',
  );
  readonly accessTokenExpiresInSeconds = parseDuration(
    process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m',
  );
  readonly refreshTokenExpiresInSeconds = parseDuration(
    process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d',
  );
  readonly corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
}

function requiredSecret(name: string, developmentFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be configured in production`);
  }
  return developmentFallback;
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer: ${value}`);
  }
  return parsed;
}

function parseDuration(value: string): number {
  const match = /^(\d+)([smhd])?$/.exec(value.trim());
  if (!match) throw new Error(`Invalid duration: ${value}`);
  const amount = Number(match[1]);
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 } as const;
  const unit = (match[2] ?? 's') as keyof typeof multipliers;
  return amount * multipliers[unit];
}
