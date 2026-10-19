import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  adminReviewListQuerySchema,
  adminReviewUpdateSchema,
  idSchema,
  localeQuerySchema,
  productReviewsQuerySchema,
  reviewInputSchema,
  slugSchema,
  type AdminReviewDto,
  type LocaleQuery,
  type MyReviewDto,
  type Paginated,
  type ProductReviewsDto,
} from '@teran/contracts';
import type { z } from 'zod';
import { CurrentActor, type Actor } from '../admin/admin-support.js';
import { CurrentAuth, RequireAuth, RequireStaff } from '../auth/auth.guard.js';
import type { RequestAuth } from '../auth/auth.types.js';
import { ReviewsService } from './reviews.service.js';

/** Published reviews change rarely and are the same for every visitor (as the catalogue). */
const PUBLIC_CACHE = 'public, max-age=30, stale-while-revalidate=120';

/**
 * A product's reviews (ADR-042): anyone reads the published ones; a signed-in customer reads,
 * saves and deletes their own. Staff accounts cannot review (the shop does not rate itself).
 */
@ApiTags('reviews')
@Controller('catalog/products/:slug/reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: "A product's published reviews, newest first, and its stars' spread" })
  @ApiOkResponse({ description: 'ProductReviewsDto' })
  list(
    @Param('slug', { schema: slugSchema }) slug: string,
    @Query({ schema: productReviewsQuerySchema })
    query: z.output<typeof productReviewsQuerySchema>,
  ): Promise<ProductReviewsDto> {
    return this.reviews.list(slug, query.page, query.pageSize);
  }

  @Get('mine')
  @RequireAuth({ roles: ['CUSTOMER'] })
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: "The signed-in customer's own review of the product, or null" })
  @ApiOkResponse({ description: 'MyReviewDto | null' })
  async mine(
    @CurrentAuth() auth: RequestAuth,
    @Param('slug', { schema: slugSchema }) slug: string,
  ): Promise<{ review: MyReviewDto | null }> {
    return { review: await this.reviews.mine(auth.userId, slug) };
  }

  @Put('mine')
  @RequireAuth({ roles: ['CUSTOMER'] })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Rate the product (1-5 stars, optional comment); replaces an earlier one',
  })
  @ApiOkResponse({ description: 'MyReviewDto' })
  save(
    @CurrentAuth() auth: RequestAuth,
    @Param('slug', { schema: slugSchema }) slug: string,
    @Query({ schema: localeQuerySchema }) query: LocaleQuery,
    @Body({ schema: reviewInputSchema }) body: z.output<typeof reviewInputSchema>,
  ): Promise<MyReviewDto> {
    return this.reviews.save(auth, slug, body, query.locale);
  }

  @Delete('mine')
  @RequireAuth({ roles: ['CUSTOMER'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Delete the signed-in customer's own review of the product" })
  remove(
    @CurrentAuth() auth: RequestAuth,
    @Param('slug', { schema: slugSchema }) slug: string,
  ): Promise<void> {
    return this.reviews.remove(auth.userId, slug);
  }
}

/** Reviews in the admin area: every one, hidden or shown, with hide, show and delete. */
@ApiTags('admin')
@Controller('admin/reviews')
@RequireStaff()
export class AdminReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'Paginated<AdminReviewDto>' })
  list(
    @Query({ schema: adminReviewListQuerySchema })
    query: z.output<typeof adminReviewListQuerySchema>,
  ): Promise<Paginated<AdminReviewDto>> {
    return this.reviews.adminList(query);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hide a review from the site, or show it again' })
  update(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: adminReviewUpdateSchema }) body: z.output<typeof adminReviewUpdateSchema>,
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    return this.reviews.setStatus(id, body.status, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a review for good' })
  remove(
    @Param('id', { schema: idSchema }) id: string,
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    return this.reviews.adminRemove(id, actor);
  }
}
