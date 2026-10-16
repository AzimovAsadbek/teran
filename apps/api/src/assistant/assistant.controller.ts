import { Body, Controller, Get, Header, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  assistantRequestSchema,
  type AssistantMode,
  type AssistantResponse,
} from '@teran/contracts';
import type { z } from 'zod';
import { AssistantService } from './assistant.service.js';

/**
 * The public product advisor. Requests are validated and rate limited per visitor (each one may
 * reach an AI provider); nothing about the visitor is stored or sent beyond the request text,
 * with phone numbers and e-mail addresses removed.
 */
@ApiTags('assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Get('status')
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({ summary: 'Whether answers come from an AI model or rule-based matching' })
  status(): { mode: AssistantMode } {
    return { mode: this.assistant.mode };
  }

  @Post('recommend')
  @HttpCode(200)
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Products from the live catalogue that match a shopper’s request' })
  @ApiOkResponse({ description: 'AssistantResponse' })
  recommend(
    @Body({ schema: assistantRequestSchema }) body: z.output<typeof assistantRequestSchema>,
  ): Promise<AssistantResponse> {
    return this.assistant.recommend(body);
  }
}
