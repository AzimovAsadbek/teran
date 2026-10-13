import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  type AcceptedDto,
  type AuthFeaturesDto,
  type CurrentUserDto,
  type LoginInput,
} from '@teran/contracts';
import type { Request, Response } from 'express';
import type { z } from 'zod';
import { AuthService } from './auth.service.js';
import { CurrentAuth, RequireAuth } from './auth.guard.js';
import type { RequestAuth } from './auth.types.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('features')
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({ summary: 'Which account features are available (password reset needs e-mail)' })
  @ApiOkResponse({ description: 'AuthFeaturesDto' })
  features(): AuthFeaturesDto {
    return this.auth.features();
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } })
  @ApiOperation({ summary: 'Create a customer account and sign in' })
  @ApiOkResponse({ description: 'CurrentUserDto' })
  register(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body({ schema: registerSchema }) body: z.output<typeof registerSchema>,
  ): Promise<CurrentUserDto> {
    return this.auth.register(request, response, body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in with e-mail and password (sets an HttpOnly session cookie)' })
  @ApiOkResponse({ description: 'CurrentUserDto' })
  login(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body({ schema: loginSchema }) body: LoginInput,
  ): Promise<CurrentUserDto> {
    return this.auth.login(request, response, body);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sign out and remove the session cookie' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(request, response);
  }

  @Get('me')
  @RequireAuth()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'The signed-in user' })
  @ApiOkResponse({ description: 'CurrentUserDto' })
  me(@CurrentAuth() auth: RequestAuth): CurrentUserDto {
    return {
      id: auth.userId,
      email: auth.email,
      role: auth.role,
      firstName: auth.firstName,
      lastName: auth.lastName,
      phone: auth.phone,
      locale: auth.locale,
    };
  }

  @Patch('me')
  @RequireAuth()
  @ApiOperation({ summary: "Update the signed-in user's profile" })
  @ApiOkResponse({ description: 'CurrentUserDto' })
  updateProfile(
    @CurrentAuth() auth: RequestAuth,
    @Body({ schema: updateProfileSchema }) body: z.output<typeof updateProfileSchema>,
  ): Promise<CurrentUserDto> {
    return this.auth.updateProfile(auth.userId, body);
  }

  @Post('password/change')
  @RequireAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @ApiOperation({ summary: 'Change password (signs out other devices)' })
  async changePassword(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @CurrentAuth() auth: RequestAuth,
    @Body({ schema: changePasswordSchema }) body: z.output<typeof changePasswordSchema>,
  ): Promise<void> {
    await this.auth.changePassword(request, response, auth.userId, body);
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } })
  @ApiOperation({
    summary: 'E-mail a password reset link (same response whether or not the account exists)',
  })
  @ApiOkResponse({ description: 'AcceptedDto' })
  async forgotPassword(
    @Body({ schema: forgotPasswordSchema }) body: z.output<typeof forgotPasswordSchema>,
  ): Promise<AcceptedDto> {
    await this.auth.requestPasswordReset(body.email, body.locale);
    return { accepted: true };
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  @ApiOperation({ summary: 'Set a new password with a reset token (signs out all devices)' })
  async resetPassword(
    @Body({ schema: resetPasswordSchema }) body: z.output<typeof resetPasswordSchema>,
  ): Promise<void> {
    await this.auth.resetPassword(body.token, body.password);
  }
}
