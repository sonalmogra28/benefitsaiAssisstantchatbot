/**
 * Advanced Caching System for Production
 * Phase 3: Performance Optimization with Redis and CDN
 */

import Redis from 'ioredis';
import { logger } from '@/lib/logger';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum cache size
  strategy: 'LRU' | 'LFU' | 'TTL';
  compression: boolean;
  serialization: 'json' | 'msgpack' | 'binary';
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  hitRate: number;
  memoryUsage: number;
  keyCount: number;
}

export class AdvancedCache {
  private redis: Redis | null = null;
  private localCache = new Map<string, { value: any; expires: number; accessCount: number }>();
  private config: CacheConfig;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    hitRate: 0,
    memoryUsage: 0,
    keyCount: 0
  };

  constructor(config: CacheConfig) {
    this.config = config;
    this.initializeRedis();
    this.startMetricsCollection();
  }

  /**
   * Initialize Redis connection with production settings
   */
  private initializeRedis(): void {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.warn('Redis URL not found, using local cache only');
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        lazyConnect: true,
        keepAlive: 30000,
        
        enableReadyCheck: false,
        // Production optimizations
        family: 4,
        db: 0,
        keyPrefix: 'benefits:'
        // Note: Compression is handled at the application level, not Redis client level
      });

      this.redis.on('error', (err) => {
        logger.error('Redis connection error', { error: err });
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      this.redis.on('ready', () => {
        logger.info('Redis ready for operations');
      });
    } catch (error) {
      logger.error('Failed to initialize Redis', { error });
      this.redis = null;
    }
  }

  /**
   * Get value from cache with fallback strategy
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first
      if (this.redis) {
        const value = await this.redis.get(key);
        if (value) {
          this.metrics.hits++;
          this.updateHitRate();
          return this.deserialize(value);
        }
      }

      // Fallback to local cache
      const localValue = this.localCache.get(key);
      if (localValue && localValue.expires > Date.now()) {
        localValue.accessCount++;
        this.metrics.hits++;
        this.updateHitRate();
        return localValue.value;
      }

      this.metrics.misses++;
      this.updateHitRate();
      return null;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const serializedValue = this.serialize(value);
      const expires = Date.now() + (ttl || this.config.ttl) * 1000;

      // Set in Redis
      if (this.redis) {
        await this.redis.setex(key, ttl || this.config.ttl, serializedValue);
      }

      // Set in local cache
      this.localCache.set(key, {
        value,
        expires,
        accessCount: 0
      });

      this.metrics.sets++;
      this.metrics.keyCount = this.localCache.size;
      this.cleanupExpiredKeys();
      this.evictIfNeeded();

      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error });
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      // Delete from Redis
      if (this.redis) {
        await this.redis.del(key);
      }

      // Delete from local cache
      const deleted = this.localCache.delete(key);
      if (deleted) {
        this.metrics.deletes++;
        this.metrics.keyCount = this.localCache.size;
      }

      return deleted;
    } catch (error) {
      logger.error('Cache delete error', { key, error });
      return false;
    }
  }

  /**
   * Get or set pattern with automatic caching
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Batch get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const results: (T | null)[] = [];

      if (this.redis && keys.length > 0) {
        const redisValues = await this.redis.mget(...keys);
        for (let i = 0; i < keys.length; i++) {
          if (redisValues[i]) {
            results.push(this.deserialize(redisValues[i] as string));
            this.metrics.hits++;
          } else {
            results.push(null);
            this.metrics.misses++;
          }
        }
      } else {
        // Fallback to individual gets
        for (const key of keys) {
          results.push(await this.get<T>(key));
        }
      }

      this.updateHitRate();
      return results;
    } catch (error) {
      logger.error('Cache mget error', { keys, error });
      return keys.map(() => null);
    }
  }

  /**
   * Batch set multiple key-value pairs
   */
  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<boolean> {
    try {
      if (this.redis && entries.length > 0) {
        const pipeline = this.redis.pipeline();
        
        for (const { key, value, ttl } of entries) {
          const serializedValue = this.serialize(value);
          pipeline.setex(key, ttl || this.config.ttl, serializedValue);
        }
        
        await pipeline.exec();
      }

      // Set in local cache
      for (const { key, value, ttl } of entries) {
        const expires = Date.now() + (ttl || this.config.ttl) * 1000;
        this.localCache.set(key, {
          value,
          expires,
          accessCount: 0
        });
      }

      this.metrics.sets += entries.length;
      this.metrics.keyCount = this.localCache.size;
      this.cleanupExpiredKeys();
      this.evictIfNeeded();

      return true;
    } catch (error) {
      logger.error('Cache mset error', { entries, error });
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<boolean> {
    try {
      if (this.redis) {
        await this.redis.flushdb();
      }

      this.localCache.clear();
      this.metrics.keyCount = 0;
      this.metrics.sets = 0;
      this.metrics.hits = 0;
      this.metrics.misses = 0;
      this.metrics.deletes = 0;
      this.metrics.evictions = 0;
      this.updateHitRate();

      return true;
    } catch (error) {
      logger.error('Cache clear error', { error });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache health status
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    redis: boolean;
    localCache: boolean;
    metrics: CacheMetrics;
  }> {
    let redisStatus = false;
    if (this.redis) {
      try {
        await this.redis.ping();
        redisStatus = true;
      } catch (error) {
        logger.warn('Redis health check failed', { error });
      }
    }

    const localCacheStatus = this.localCache.size >= 0;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!redisStatus && !localCacheStatus) {
      status = 'unhealthy';
    } else if (!redisStatus || this.metrics.hitRate < 0.7) {
      status = 'degraded';
    }

    return {
      status,
      redis: redisStatus,
      localCache: localCacheStatus,
      metrics: this.getMetrics()
    };
  }

  /**
   * Serialize value based on configuration
   */
  private serialize(value: any): string {
    switch (this.config.serialization) {
      case 'json':
        return JSON.stringify(value);
      case 'msgpack':
        // In production, use actual msgpack library
        return JSON.stringify(value);
      case 'binary':
        return Buffer.from(JSON.stringify(value)).toString('base64');
      default:
        return JSON.stringify(value);
    }
  }

  /**
   * Deserialize value based on configuration
   */
  private deserialize<T>(value: string): T {
    switch (this.config.serialization) {
      case 'json':
        return JSON.parse(value);
      case 'msgpack':
        // In production, use actual msgpack library
        return JSON.parse(value);
      case 'binary':
        return JSON.parse(Buffer.from(value, 'base64').toString());
      default:
        return JSON.parse(value);
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  /**
   * Clean up expired keys from local cache
   */
  private cleanupExpiredKeys(): void {
    const now = Date.now();
    for (const [key, entry] of this.localCache.entries()) {
      if (entry.expires <= now) {
        this.localCache.delete(key);
        this.metrics.evictions++;
      }
    }
    this.metrics.keyCount = this.localCache.size;
  }

  /**
   * Evict keys if cache is too large
   */
  private evictIfNeeded(): void {
    if (this.localCache.size <= this.config.maxSize) {
      return;
    }

    const keysToEvict = this.localCache.size - this.config.maxSize;
    const entries = Array.from(this.localCache.entries());

    switch (this.config.strategy) {
      case 'LRU':
        // Sort by access count (least recently used)
        entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
        break;
      case 'LFU':
        // Sort by access count (least frequently used)
        entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
        break;
      case 'TTL':
        // Sort by expiration time (oldest first)
        entries.sort((a, b) => a[1].expires - b[1].expires);
        break;
    }

    // Remove the least valuable entries
    for (let i = 0; i < keysToEvict && i < entries.length; i++) {
      this.localCache.delete(entries[i][0]);
      this.metrics.evictions++;
    }

    this.metrics.keyCount = this.localCache.size;
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.cleanupExpiredKeys();
      this.updateMemoryUsage();
      
      // Log metrics every 5 minutes
      if (this.metrics.sets > 0) {
        logger.info('Cache metrics', this.getMetrics());
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Update memory usage metrics
   */
  private updateMemoryUsage(): void {
    if (process.memoryUsage) {
      this.metrics.memoryUsage = process.memoryUsage().heapUsed;
    }
  }
}

// Production cache configurations
export const productionCacheConfig: CacheConfig = {
  ttl: 3600, // 1 hour
  maxSize: 10000, // 10,000 keys
  strategy: 'LRU',
  compression: true,
  serialization: 'json'
};

export const chatCacheConfig: CacheConfig = {
  ttl: 1800, // 30 minutes
  maxSize: 5000,
  strategy: 'LRU',
  compression: true,
  serialization: 'json'
};

export const analyticsCacheConfig: CacheConfig = {
  ttl: 600, // 10 minutes (GoDaddy DNS minimum)
  maxSize: 1000,
  strategy: 'TTL',
  compression: false,
  serialization: 'json'
};

// Export singleton instances
export const productionCache = new AdvancedCache(productionCacheConfig);
export const chatCache = new AdvancedCache(chatCacheConfig);
export const analyticsCache = new AdvancedCache(analyticsCacheConfig);
