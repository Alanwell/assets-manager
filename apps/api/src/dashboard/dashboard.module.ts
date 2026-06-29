import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AssetsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
