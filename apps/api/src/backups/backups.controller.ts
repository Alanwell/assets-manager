import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { BackupsService } from './backups.service';

@ApiTags('backups')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('backups')
export class BackupsController {
  constructor(private readonly service: BackupsService) {}

  @Post('create')
  create() {
    return this.service.create();
  }

  @Get('list')
  list() {
    return this.service.list();
  }
}
