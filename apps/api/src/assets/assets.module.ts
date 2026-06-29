import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { DepreciationProfilesController } from './depreciation-profiles.controller';
import { DepreciationProfilesService } from './depreciation-profiles.service';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

@Module({
  controllers: [
    AssetsController,
    DepreciationProfilesController,
    MaintenanceController,
    AttachmentsController,
  ],
  providers: [
    AssetsService,
    DepreciationProfilesService,
    MaintenanceService,
    AttachmentsService,
  ],
  exports: [AssetsService],
})
export class AssetsModule {}
