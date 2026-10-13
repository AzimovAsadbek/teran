import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import type { Env } from '../config/env.js';
import { ContentModule } from '../content/content.module.js';
import { AdminContentController } from './content.controller.js';
import { AdminContentService } from './content.service.js';
import { AdminDashboardController } from './dashboard.controller.js';
import { AdminDashboardService } from './dashboard.service.js';
import { AdminInquiriesController } from './inquiries.controller.js';
import { AdminInquiriesService } from './inquiries.service.js';
import { AdminInventoryController } from './inventory.controller.js';
import { AdminInventoryService } from './inventory.service.js';
import { AdminOrdersController } from './orders.controller.js';
import { AdminOrdersService } from './orders.service.js';
import { AdminPeopleController } from './people.controller.js';
import { AdminPeopleService } from './people.service.js';
import { AdminProductsController } from './products.controller.js';
import { AdminProductsService } from './products.service.js';
import { AdminCategoriesController, AdminCollectionsController } from './taxonomy.controller.js';
import { AdminTaxonomyService } from './taxonomy.service.js';

/**
 * Staff API under /api/v1/admin. Every controller is guarded by @RequireStaff (MANAGER or ADMIN);
 * staff accounts, site settings, delivery prices and personal-data exports require ADMIN.
 */
@Module({
  imports: [
    ContentModule,
    // Uploads stay in memory (sharp re-encodes them) and are capped by UPLOAD_MAX_BYTES.
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        limits: { fileSize: config.get('UPLOAD_MAX_BYTES', { infer: true }), files: 1, fields: 5 },
      }),
    }),
  ],
  controllers: [
    AdminDashboardController,
    AdminProductsController,
    AdminCategoriesController,
    AdminCollectionsController,
    AdminInventoryController,
    AdminOrdersController,
    AdminPeopleController,
    AdminInquiriesController,
    AdminContentController,
  ],
  providers: [
    AdminDashboardService,
    AdminProductsService,
    AdminTaxonomyService,
    AdminInventoryService,
    AdminOrdersService,
    AdminPeopleService,
    AdminInquiriesService,
    AdminContentService,
  ],
})
export class AdminModule {}
