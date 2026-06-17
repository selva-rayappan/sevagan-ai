import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckError,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

describe('HealthController', () => {
  let controller: HealthController;
  let redisService: jest.Mocked<RedisService>;
  let healthCheckService: jest.Mocked<HealthCheckService>;

  beforeEach(async () => {
    const mockRedisService = { ping: jest.fn() };
    const mockPrismaService = {};
    const mockHealthCheckService = { check: jest.fn() };
    const mockPrismaHealthIndicator = { pingCheck: jest.fn() };
    const mockMemoryHealthIndicator = { checkHeap: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: PrismaHealthIndicator, useValue: mockPrismaHealthIndicator },
        { provide: MemoryHealthIndicator, useValue: mockMemoryHealthIndicator },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    redisService = module.get(RedisService);
    healthCheckService = module.get(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('liveness()', () => {
    it('returns ok status with an ISO timestamp', () => {
      const result = controller.liveness();
      expect(result.status).toBe('ok');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('check()', () => {
    it('calls HealthCheckService.check and returns its result', async () => {
      const mockResult = { status: 'ok', details: {} } as any;
      healthCheckService.check.mockResolvedValue(mockResult);

      const result = await controller.check();
      expect(healthCheckService.check).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResult);
    });
  });

  describe('checkRedis() — private method via reflection', () => {
    it('returns redis up when ping succeeds', async () => {
      redisService.ping.mockResolvedValue(true);
      const result = await (controller as any).checkRedis();
      expect(result).toEqual({ redis: { status: 'up' } });
    });

    it('throws HealthCheckError when ping fails', async () => {
      redisService.ping.mockResolvedValue(false);
      await expect((controller as any).checkRedis()).rejects.toBeInstanceOf(HealthCheckError);
    });
  });
});
