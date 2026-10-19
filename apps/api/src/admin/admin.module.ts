import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import type { Env } from '../config/env.js';
import { ContentModule } from '../content/content.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { TelegramModule } from '../telegram/telegram.module.js';
import { AdminContentController } from './content.controller.js';
import { AdminContentService } from './content.service.js';
import { GeocodeService } from './geocode.service.js';
import { AdminDashboardController } from './dashboard.controller.js';
import { AdminDashboardService } from './dashboard.service.js';
import { AdminInquiriesController } from './inquiries.controller.js';
import { AdminInquiriesService } from './inquiries.service.js';
import { AdminInventoryController } from './inventory.controller.js';
import { AdminMediaController } from './media.controller.js';
import { AdminMediaService } from './media.service.js';
import { AdminInventoryService } from './inventory.service.js';
import { AdminOrdersController } from './orders.controller.js';
import { AdminOrdersService } from './orders.service.js';
import { AdminPeopleController } from './people.controller.js';
import { AdminPeopleService } from './people.service.js';
import { AdminProductTypesController } from './product-types.controller.js';
import { AdminProductTypesService } from './product-types.service.js';
import { AdminProductsController } from './products.controller.js';
import { AdminProductsService } from './products.service.js';
import { AdminCategoriesController, AdminCollectionsController } from './taxonomy.controller.js';
import { AdminTelegramController } from './telegram.controller.js';
import { AdminTaxonomyService } from './taxonomy.service.js';

/**
 * Staff API under /api/v1/admin. Every controller is guarded by @RequireStaff (MANAGER or ADMIN);
 * staff accounts, site settings, delivery prices and personal-data exports require ADMIN.
 */
@Module({
  imports: [
    ContentModule,
    PaymentsModule,
    TelegramModule,
    // Uploads stay in memory (sharp re-encodes them) and are capped by UPLOAD_MAX_BYTES. At most
    // two files: a page picture and its phone crop; every other endpoint takes only "file".
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        limits: { fileSize: config.get('UPLOAD_MAX_BYTES', { infer: true }), files: 2, fields: 5 },
      }),
    }),
  ],
  controllers: [
    AdminDashboardController,
    AdminProductsController,
    AdminProductTypesController,
    AdminCategoriesController,
    AdminCollectionsController,
    AdminInventoryController,
    AdminOrdersController,
    AdminPeopleController,
    AdminInquiriesController,
    AdminContentController,
    AdminMediaController,
    AdminTelegramController,
  ],
  providers: [
    AdminDashboardService,
    AdminProductsService,
    AdminMediaService,
    AdminProductTypesService,
    AdminTaxonomyService,
    AdminInventoryService,
    AdminOrdersService,
    AdminPeopleService,
    AdminInquiriesService,
    AdminContentService,
    GeocodeService,
  ],
})
export class AdminModule {}
