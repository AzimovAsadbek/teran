import { Controller, Header, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClickService, type ClickResponse } from './click.service.js';
import type { PaymeResponse } from './payme-protocol.js';
import { PaymeService } from './payme.service.js';

/**
 * Server-to-server endpoints called by the payment providers. They carry no cookies and are
 * authenticated by each provider's own mechanism (Payme: Basic auth with the cashbox key; Click:
 * MD5 signature with the secret key). Both answer HTTP 200 with the provider's error format.
 */
@ApiExcludeController()
@Controller('payments')
export class ProviderCallbacksController {
  constructor(
    private readonly payme: PaymeService,
    private readonly click: ClickService,
  ) {}

  @Post('payme')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  paymeRpc(@Req() request: Request): Promise<PaymeResponse> {
    return this.payme.handle(request);
  }

  @Post('click/prepare')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  clickPrepare(@Req() request: Request): Promise<ClickResponse> {
    return this.click.prepare(request.body);
  }

  @Post('click/complete')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  clickComplete(@Req() request: Request): Promise<ClickResponse> {
    return this.click.complete(request.body);
  }
}
