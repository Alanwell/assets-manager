import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  imports: [AssetsModule],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
