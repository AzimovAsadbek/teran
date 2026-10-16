import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';

/** The product advisor (docs/architecture/product-advisor.md). */
@Module({
  imports: [CatalogModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
