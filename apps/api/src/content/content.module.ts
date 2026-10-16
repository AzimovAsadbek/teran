import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service.js';
import { ContentController } from './content.controller.js';
import { MediaService } from './media.service.js';
import { SettingsService } from './settings.service.js';

@Module({
  controllers: [ContentController],
  providers: [ArticlesService, MediaService, SettingsService],
  exports: [ArticlesService, MediaService, SettingsService],
})
export class ContentModule {}
