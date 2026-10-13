import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service.js';
import { ContentController } from './content.controller.js';
import { SettingsService } from './settings.service.js';

@Module({
  controllers: [ContentController],
  providers: [ArticlesService, SettingsService],
  exports: [ArticlesService, SettingsService],
})
export class ContentModule {}
