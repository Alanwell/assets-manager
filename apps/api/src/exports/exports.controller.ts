import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ExportsService } from './exports.service';

@ApiTags('exports')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('exports')
export class ExportsController {
  constructor(private readonly service: ExportsService) {}

  @Get('assets.csv')
  @ApiProduces('text/csv')
  exportAssets(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): string {
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header(
      'Content-Disposition',
      `attachment; filename="assets-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    return this.service.assetsCsv(user.userId);
  }
}
