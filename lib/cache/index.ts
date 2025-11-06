/**
 * Safe Cache API - Never Throws, Respects Disabled State
 * 
 * All operations gracefully degrade when Redis is unavailable.
 * No exceptions bubble up to callers.
 */

import { getRedis, cacheEnabled } from "./redis";
import { logger } from "@/lib/logger";

/**
 * Get cached value (returns null if cache miss or unavailable)
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const value = await redis.get(key);
    if (!value) return null;

    const parsed = JSON.parse(value) as T;
    logger.debug({ key }, "[Cache] Hit");
    return parsed;

  } catch (err) {
    logger.warn({ key, err: String(err) }, "[Cache] Get failed; returning null");
    return null;
  }
}

/**
 * Set cached value with TTL (no-op if cache unavailable)
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const serialized = JSON.stringify(value);
    await redis.setex(key, ttlSeconds, serialized);
    logger.debug({ key, ttl: `${ttlSeconds}s` }, "[Cache] Set");

  } catch (err) {
    logger.warn({ key, err: String(err) }, "[Cache] Set failed; ignoring");
  }
}

/**
 * Delete cached value (no-op if cache unavailable)
 */
export async function cacheDel(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(key);
    logger.debug({ key }, "[Cache] Deleted");

  } catch (err) {
    logger.warn({ key, err: String(err) }, "[Cache] Delete failed; ignoring");
  }
}

/**
 * Check if cache is healthy and available
 */
export function isCacheAvailable(): boolean {
  return cacheEnabled();
}

/**
 * Export for backward compatibility
 */
export { getRedis, cacheEnabled } from "./redis";
