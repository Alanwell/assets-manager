import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import {
  hashPassword,
  hashToken,
  verifyPassword,
} from '../common/security/password';
import { AppConfigService } from '../config/app-config.service';
import { DATABASE } from '../database/database.constants';
import type { AppDatabase } from '../database/database.types';
import { refreshTokens } from '../database/schema';
import type {
  AuthResponseDto,
  LoginRequestDto,
  RegisterRequestDto,
  UserResponseDto,
} from './dto/auth.dto';
import type { RefreshTokenPayload } from './auth.types';
import { UsersRepository, type UserRecord } from './users.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
    @Inject(DATABASE) private readonly db: AppDatabase,
  ) {}

  async register(dto: RegisterRequestDto): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase();
    if (this.usersRepository.findByEmail(email)) {
      throw new ConflictException('该邮箱已注册');
    }
    const now = new Date().toISOString();
    const user = this.usersRepository.create({
      id: randomUUID(),
      email,
      passwordHash: await hashPassword(dto.password),
      displayName: dto.displayName.trim(),
      createdAt: now,
      updatedAt: now,
    });
    return this.issueTokenPair(user);
  }

  async login(dto: LoginRequestDto): Promise<AuthResponseDto> {
    const user = this.usersRepository.findByEmail(dto.email.toLowerCase());
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('邮箱或密码错误');
    }
    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.config.jwtRefreshSecret,
        },
      );
      if (payload.type !== 'refresh' || !payload.sub || !payload.jti) {
        throw new Error('Invalid refresh token');
      }
    } catch {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
    const now = new Date().toISOString();
    const tokenRecord = this.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, hashToken(refreshToken)),
          eq(refreshTokens.id, payload.jti),
          eq(refreshTokens.userId, payload.sub),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, now),
        ),
      )
      .get();
    if (!tokenRecord) throw new UnauthorizedException('刷新令牌无效或已过期');
    const user = this.usersRepository.findById(tokenRecord.userId);
    if (!user) throw new UnauthorizedException('用户不存在');
    this.db
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(
        and(
          eq(refreshTokens.id, tokenRecord.id),
          isNull(refreshTokens.revokedAt),
        ),
      )
      .run();
    return this.issueTokenPair(user);
  }

  logout(refreshToken: string): void {
    this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date().toISOString() })
      .where(
        and(
          eq(refreshTokens.tokenHash, hashToken(refreshToken)),
          isNull(refreshTokens.revokedAt),
        ),
      )
      .run();
  }

  getUser(userId: string): UserResponseDto {
    const user = this.usersRepository.findById(userId);
    if (!user) throw new UnauthorizedException('用户不存在');
    return toUserResponse(user);
  }

  private async issueTokenPair(user: UserRecord): Promise<AuthResponseDto> {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'access' },
      {
        secret: this.config.jwtAccessSecret,
        expiresIn: this.config.accessTokenExpiresInSeconds,
      },
    );
    const refreshTokenId = randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + this.config.refreshTokenExpiresInSeconds * 1000,
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, jti: refreshTokenId, type: 'refresh' },
      {
        secret: this.config.jwtRefreshSecret,
        expiresIn: this.config.refreshTokenExpiresInSeconds,
      },
    );
    this.db
      .insert(refreshTokens)
      .values({
        id: refreshTokenId,
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: expiresAt.toISOString(),
        createdAt: createdAt.toISOString(),
      })
      .run();
    return { accessToken, refreshToken, user: toUserResponse(user) };
  }
}

function toUserResponse(user: UserRecord): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    ...(user.avatarUrl === null ? {} : { avatarUrl: user.avatarUrl }),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
