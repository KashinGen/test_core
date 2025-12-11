import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Redis } from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const result = await this.redis.ping();
      const isHealthy = result === 'PONG';
      
      return this.getStatus(key, isHealthy, {
        message: isHealthy ? 'Redis is healthy' : 'Redis ping failed',
      });
    } catch (error) {
      throw new HealthCheckError('Redis health check failed', this.getStatus(key, false, { error: error.message }));
    }
  }
}



