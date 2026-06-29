import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateDepreciationProfileDto } from './depreciation-profiles.dto';
import { DepreciationProfilesService } from './depreciation-profiles.service';

@ApiTags('asset depreciation profiles')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('assets/:assetId/depreciation-profiles')
export class DepreciationProfilesController {
  constructor(private readonly service: DepreciationProfilesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assetId', ParseUUIDPipe) assetId: string,
  ) {
    return this.service.list(user.userId, assetId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Body() dto: CreateDepreciationProfileDto,
  ) {
    return this.service.create(user.userId, assetId, dto);
  }
}
