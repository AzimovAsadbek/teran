import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service.js';

const DATABASE_CHECK_TIMEOUT_MS = 2_000;

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness: the process is up and serving HTTP' })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness: the API can reach PostgreSQL' })
  async ready(): Promise<{ status: 'ok'; database: 'up' }> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), DATABASE_CHECK_TIMEOUT_MS);
        }),
      ]);
    } catch {
      throw new ServiceUnavailableException('Database is not reachable');
    } finally {
      clearTimeout(timer);
    }
    return { status: 'ok', database: 'up' };
  }
}
