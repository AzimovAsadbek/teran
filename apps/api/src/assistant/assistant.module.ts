import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { ContentModule } from '../content/content.module.js';
import { DeliveryService } from '../delivery/delivery.service.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';

/** The chat's AI assistant (ADR-055). */
@Module({
  imports: [CatalogModule, ContentModule],
  controllers: [AssistantController],
  providers: [AssistantService, DeliveryService],
})
export class AssistantModule {}
