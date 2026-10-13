import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  contactInquirySchema,
  newsletterSubscribeSchema,
  newsletterUnsubscribeSchema,
  wholesaleInquirySchema,
  type AcceptedDto,
} from '@teran/contracts';
import type { z } from 'zod';
import { InquiriesService } from './inquiries.service.js';

const ACCEPTED: AcceptedDto = { accepted: true };

@ApiTags('inquiries')
@Controller()
@Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
export class InquiriesController {
  constructor(private readonly inquiries: InquiriesService) {}

  @Post('inquiries/contact')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a message to TERAN' })
  @ApiOkResponse({ description: 'AcceptedDto' })
  async contact(
    @Body({ schema: contactInquirySchema }) body: z.output<typeof contactInquirySchema>,
  ): Promise<AcceptedDto> {
    await this.inquiries.createContact(body);
    return ACCEPTED;
  }

  @Post('inquiries/wholesale')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request wholesale / partnership contact' })
  @ApiOkResponse({ description: 'AcceptedDto' })
  async wholesale(
    @Body({ schema: wholesaleInquirySchema }) body: z.output<typeof wholesaleInquirySchema>,
  ): Promise<AcceptedDto> {
    await this.inquiries.createWholesale(body);
    return ACCEPTED;
  }

  @Post('newsletter/subscribe')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Subscribe an e-mail address to the newsletter' })
  @ApiOkResponse({ description: 'AcceptedDto' })
  async subscribe(
    @Body({ schema: newsletterSubscribeSchema }) body: z.output<typeof newsletterSubscribeSchema>,
  ): Promise<AcceptedDto> {
    await this.inquiries.subscribe(body);
    return ACCEPTED;
  }

  @Post('newsletter/unsubscribe')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Unsubscribe with the id and token from a newsletter link' })
  @ApiOkResponse({ description: 'AcceptedDto' })
  async unsubscribe(
    @Body({ schema: newsletterUnsubscribeSchema })
    body: z.output<typeof newsletterUnsubscribeSchema>,
  ): Promise<AcceptedDto> {
    await this.inquiries.unsubscribe(body.id, body.token);
    return ACCEPTED;
  }
}
