import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { CategoriesModule } from './categories/categories.module';
import { TagsModule } from './tags/tags.module';
import { AssetsModule } from './assets/assets.module';
import { BackupsModule } from './backups/backups.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExportsModule } from './exports/exports.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AuthModule,
    CategoriesModule,
    TagsModule,
    AssetsModule,
    DashboardModule,
    ExportsModule,
    BackupsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
