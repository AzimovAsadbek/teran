import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { assistantChatSchema, type AssistantReplyDto } from '@teran/contracts';
import { AssistantService, type AssistantInput } from './assistant.service.js';

/**
 * The chat's AI assistant (ADR-055). Questions are validated and rate limited per visitor (each
 * one reaches Gemini); nothing of the conversation is stored, and phone numbers and e-mail
 * addresses are removed before a question leaves the server.
 */
@ApiTags('assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('chat')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'An answer from TERAN’s AI assistant, with the products it names' })
  @ApiOkResponse({ description: 'AssistantReplyDto' })
  chat(@Body({ schema: assistantChatSchema }) body: AssistantInput): Promise<AssistantReplyDto> {
    return this.assistant.chat(body);
  }
}
