import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  CreateMaintenanceRecordDto,
  UpdateMaintenanceRecordDto,
} from './maintenance.dto';
import { MaintenanceService } from './maintenance.service';

@ApiTags('asset maintenance records')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('assets/:assetId/maintenance-records')
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

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
    @Body() dto: CreateMaintenanceRecordDto,
  ) {
    return this.service.create(user.userId, assetId, dto);
  }

  @Patch(':recordId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() dto: UpdateMaintenanceRecordDto,
  ) {
    return this.service.update(user.userId, assetId, recordId, dto);
  }

  @Delete(':recordId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ): void {
    this.service.delete(user.userId, assetId, recordId);
  }
}
