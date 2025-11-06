/**
 * Redis Cache Client - Singleton with Graceful Degradation
 * 
 * Design principles:
 * - Lazy connection (never blocks app startup)
 * - Fail-fast with short timeouts (Vercel cold starts)
 * - Auto-disable on repeated failures (no cascading errors)
 * - Never throws (callers check null return)
 */

import Redis from "ioredis";
import { logger } from "@/lib/logger";

let client: Redis | null = null;
let disabled = false;
let initAttempted = false;

/**
 * Get Redis client (or null if unavailable/disabled)
 * Safe to call multiple times - returns cached singleton
 */
export function getRedis(): Redis | null {
  // Already disabled due to previous failures
  if (disabled) return null;

  // Return existing client
  if (client) return client;

  // Attempt initialization once
  if (!initAttempted) {
    initAttempted = true;
    try {
      const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
      
      if (!url) {
        logger.info("[Cache] No REDIS_URL configured; cache disabled");
        disabled = true;
        return null;
      }

      client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        // Fail fast on Vercel cold starts (1.5s socket timeout)
        connectTimeout: 1500,
        commandTimeout: 2000,
        retryStrategy: () => null, // Don't retry, disable immediately
      });

      // Handle connection errors gracefully
      client.on("error", (err) => {
        logger.warn({ err: String(err) }, "[Cache] Redis error; disabling cache");
        disabled = true;
        client = null;
      });

      logger.info("[Cache] Redis client initialized (lazy connect)");
      return client;

    } catch (err) {
      logger.warn({ err: String(err) }, "[Cache] Redis initialization failed; cache disabled");
      disabled = true;
      return null;
    }
  }

  return client;
}

/**
 * Check if cache is available and enabled
 */
export function cacheEnabled(): boolean {
  return !disabled && client !== null;
}

/**
 * Force-disable cache (for testing or manual override)
 */
export function disableCache(): void {
  disabled = true;
  if (client) {
    client.disconnect(false);
    client = null;
  }
  logger.info("[Cache] Manually disabled");
}
