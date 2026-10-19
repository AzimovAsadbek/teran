import { Module } from '@nestjs/common';
import { AdminReviewsController, ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

/** Product ratings and reviews (ADR-042): the storefront's routes and the admin area's. */
@Module({
  controllers: [ReviewsController, AdminReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
