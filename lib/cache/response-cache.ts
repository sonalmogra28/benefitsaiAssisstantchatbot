import type Redis from 'ioredis';
import logger from '@/lib/logger';

const CACHE_TTL_SECONDS = 3600; // Cache for 1 hour

function isBuild(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

let redisClient: Redis | null = null;

async function getRedisClient(): Promise<Redis | null> {
  if (isBuild()) return null;
  if (redisClient) return redisClient;
  
  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) {
    logger.warn('REDIS_URL not found. Response caching is disabled.', {});
    return null;
  }

  try {
    const RedisModule = await import('ioredis');
    const RedisClass = RedisModule.default;
    
    redisClient = new RedisClass(REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', { error: err });
      // Prevent further commands on critical errors
      if ((err as any).code === 'ECONNRESET' || (err as any).code === 'ETIMEDOUT') {
        redisClient?.disconnect();
      }
    });

    redisClient.on('connect', () => {
      logger.info('Successfully connected to Redis.', {});
    });
    
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis client', { error });
    return null;
  }
}

class ResponseCache {
  private generateCacheKey(query: string, companyId: string): string {
    // Simple key generation. For production, consider a more robust hashing mechanism.
    return `response_cache:${companyId}:${query.trim().toLowerCase()}`;
  }

  async get(query: string, companyId: string): Promise<string | null> {
    const client = await getRedisClient();
    if (!client) return null;

    try {
      const key = this.generateCacheKey(query, companyId);
      return await client.get(key);
    } catch (error) {
      logger.error('Redis GET error', { error });
      return null;
    }
  }

  async set(query: string, companyId: string, response: string): Promise<void> {
    const client = await getRedisClient();
    if (!client || !response) return;

    try {
      const key = this.generateCacheKey(query, companyId);
      await client.setex(key, CACHE_TTL_SECONDS, JSON.stringify(response));
    } catch (error) {
      logger.error('Redis SET error', { error });
    }
  }
}

export const responseCache = new ResponseCache();
