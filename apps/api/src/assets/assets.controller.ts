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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  AssetListQueryDto,
  ChangeAssetStatusDto,
  CreateAssetDto,
  UpdateAssetDto,
} from './assets.dto';
import { AssetsService } from './assets.service';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AssetListQueryDto,
  ) {
    return this.service.list(user.userId, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAssetDto) {
    return this.service.create(user.userId, dto);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getDetail(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.service.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.service.delete(user.userId, id);
  }

  @Post(':id/archive')
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.archive(user.userId, id);
  }

  @Post(':id/restore')
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.restore(user.userId, id);
  }

  @Post(':id/status')
  changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeAssetStatusDto,
  ) {
    return this.service.changeStatus(user.userId, id, dto);
  }

  @Get(':id/depreciation')
  depreciation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.service.getDepreciation(user.userId, id, asOfDate);
  }

  @Get(':id/timeline')
  timeline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getTimeline(user.userId, id);
  }

  @Get(':id/status-history')
  statusHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getStatusHistory(user.userId, id);
  }
}
