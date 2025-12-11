import { Module, Global } from '@nestjs/common';
import { Redis } from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        let redisHost = process.env.REDIS_HOST || 'localhost';
        if (redisHost.startsWith('redis://')) {
          redisHost = redisHost.substring(7);
        }
        
        return new Redis({
          host: redisHost,
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0', 10),
        });
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}



