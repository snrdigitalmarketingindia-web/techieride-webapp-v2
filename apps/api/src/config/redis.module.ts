import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Upstash (and other providers) supply a full REDIS_URL
        // e.g. rediss://default:password@host:6379
        const rawUrl = config.get<string>('REDIS_URL');
        const redisUrl = rawUrl?.trim();
        console.log(`[Redis] URL prefix: "${redisUrl?.substring(0, 15)}" length: ${redisUrl?.length}`);
        if (redisUrl) {
          return new Redis(redisUrl);
        }
        // Fallback: individual host/port/password (local dev)
        console.log('[Redis] Falling back to host/port config');
        return new Redis({
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD') || undefined,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
