import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.service.overview(user.userId);
  }

  @Get('category-distribution')
  categoryDistribution(@CurrentUser() user: AuthenticatedUser) {
    return this.service.categoryDistribution(user.userId);
  }

  @Get('depreciation-trend')
  depreciationTrend(@CurrentUser() user: AuthenticatedUser) {
    return this.service.depreciationTrend(user.userId);
  }

  @Get('status-distribution')
  statusDistribution(@CurrentUser() user: AuthenticatedUser) {
    return this.service.statusDistribution(user.userId);
  }

  @Get('recent-assets')
  recentAssets(@CurrentUser() user: AuthenticatedUser) {
    return this.service.recentAssets(user.userId);
  }
}
