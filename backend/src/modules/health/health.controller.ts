import { Controller, Get, Version } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import {
  HealthCheck,
  HealthCheckError,
  HealthCheckService,
  HealthIndicatorResult,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

@Public()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @Version('1')
  @HealthCheck()
  @ApiOperation({ summary: 'Full health check — DB, Redis, memory' })
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.checkRedis(),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ]);
  }

  @Get('liveness')
  @Version('1')
  @ApiOperation({ summary: 'Liveness probe — is the process alive?' })
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    const isAlive = await this.redis.ping();
    if (!isAlive) {
      throw new HealthCheckError('Redis check failed', { redis: { status: 'down' } });
    }
    return { redis: { status: 'up' } };
  }
}
