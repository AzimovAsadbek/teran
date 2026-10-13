import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  adminInquiryListQuerySchema,
  adminSimpleListQuerySchema,
  idSchema,
  inquiryUpdateSchema,
  type AdminContactInquiry,
  type AdminNewsletterSubscriber,
  type AdminWholesaleInquiry,
  type Paginated,
} from '@teran/contracts';
import type { z } from 'zod';
import { RequireStaff } from '../auth/auth.guard.js';
import { CurrentActor, type Actor } from './admin-support.js';
import { AdminInquiriesService } from './inquiries.service.js';

type InquiryQuery = z.output<typeof adminInquiryListQuerySchema>;
type InquiryUpdate = z.output<typeof inquiryUpdateSchema>;

@ApiTags('admin')
@Controller('admin')
@RequireStaff()
export class AdminInquiriesController {
  constructor(private readonly inquiries: AdminInquiriesService) {}

  @Get('inquiries/contact')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'Paginated<AdminContactInquiry>' })
  contact(
    @Query({ schema: adminInquiryListQuerySchema }) query: InquiryQuery,
  ): Promise<Paginated<AdminContactInquiry>> {
    return this.inquiries.contact(query);
  }

  @Patch('inquiries/contact/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateContact(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: inquiryUpdateSchema }) body: InquiryUpdate,
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    return this.inquiries.update('contact', id, body, actor);
  }

  @Get('inquiries/wholesale')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'Paginated<AdminWholesaleInquiry>' })
  wholesale(
    @Query({ schema: adminInquiryListQuerySchema }) query: InquiryQuery,
  ): Promise<Paginated<AdminWholesaleInquiry>> {
    return this.inquiries.wholesale(query);
  }

  @Patch('inquiries/wholesale/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateWholesale(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: inquiryUpdateSchema }) body: InquiryUpdate,
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    return this.inquiries.update('wholesale', id, body, actor);
  }

  @Get('newsletter')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'Paginated<AdminNewsletterSubscriber>' })
  subscribers(
    @Query({ schema: adminSimpleListQuerySchema })
    query: z.output<typeof adminSimpleListQuerySchema>,
  ): Promise<Paginated<AdminNewsletterSubscriber>> {
    return this.inquiries.subscribers(query);
  }

  @Get('newsletter/export.csv')
  @RequireStaff(['ADMIN'])
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="teran-newsletter.csv"')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Active subscribers with unsubscribe links (administrators only)' })
  exportSubscribers(@CurrentActor() actor: Actor): Promise<string> {
    return this.inquiries.exportSubscribers(actor);
  }
}
