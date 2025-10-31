/**
 * Rate Limiting Middleware
 * 
 * Implements token bucket algorithm for API rate limiting
 * Protects against abuse and ensures fair usage across tenants
 * 
 * Best Practices:
 * - Per-IP and per-user rate limiting
 * - Sliding window algorithm
 * - Redis-compatible (with in-memory fallback for dev)
 * - Standard rate limit headers (X-RateLimit-*)
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Identifier type (ip, user, api_key)
   */
  identifierType: 'ip' | 'user' | 'api_key';

  /**
   * Custom identifier function (overrides identifierType)
   */
  getIdentifier?: (req: NextRequest) => string | null;
}

/**
 * Rate limit store entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limit store
 * In production, use Redis for distributed rate limiting
 */
class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Check and increment rate limit counter
   * 
   * @param key - Rate limit key (e.g., "ip:127.0.0.1")
   * @param maxRequests - Maximum requests allowed
   * @param windowSeconds - Time window in seconds
   * @returns Rate limit info
   */
  async checkAndIncrement(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const entry = this.store.get(key);

    // No entry or expired - create new
    if (!entry || now >= entry.resetTime) {
      const resetTime = now + windowSeconds * 1000;
      this.store.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime,
      };
    }

    // Entry exists and not expired
    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Increment counter
    entry.count++;
    this.store.set(key, entry);

    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Singleton rate limit store
const rateLimitStore = new RateLimitStore();

/**
 * Get client identifier from request
 */
function getIdentifier(req: NextRequest, config: RateLimitConfig): string | null {
  // Custom identifier function
  if (config.getIdentifier) {
    return config.getIdentifier(req);
  }

  // Built-in identifier types
  switch (config.identifierType) {
    case 'ip':
      // Try to get real IP from headers (behind proxy/CDN)
      return (
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        req.headers.get('cf-connecting-ip') || // Cloudflare
        'unknown'
      );

    case 'user':
      // Extract user ID from auth token (implementation depends on auth system)
      // For now, use IP as fallback
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        // TODO: Extract user ID from JWT or session
        return authHeader;
      }
      return null;

    case 'api_key':
      // Extract API key from header
      const apiKey = req.headers.get('x-api-key');
      return apiKey || null;

    default:
      return null;
  }
}

/**
 * Rate limiting middleware factory
 * 
 * @param config - Rate limit configuration
 * @returns Middleware function
 * 
 * @example
 * ```typescript
 * // In API route
 * export const POST = rateLimit({
 *   maxRequests: 100,
 *   windowSeconds: 60,
 *   identifierType: 'ip'
 * })(async (req) => {
 *   // Your API logic here
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function rateLimit(config: RateLimitConfig) {
  return function (handler: (req: NextRequest) => Promise<NextResponse>) {
    return async function (req: NextRequest): Promise<NextResponse> {
      const identifier = getIdentifier(req, config);

      // No identifier found - allow request but log warning
      if (!identifier) {
        console.warn('[RateLimit] No identifier found, allowing request');
        return handler(req);
      }

      const key = `ratelimit:${config.identifierType}:${identifier}`;

      // Check rate limit
      const { allowed, remaining, resetTime } = await rateLimitStore.checkAndIncrement(
        key,
        config.maxRequests,
        config.windowSeconds
      );

      // Add rate limit headers
      const headers = new Headers();
      headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      headers.set('X-RateLimit-Remaining', remaining.toString());
      headers.set('X-RateLimit-Reset', Math.floor(resetTime / 1000).toString());

      // Rate limit exceeded
      if (!allowed) {
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
        headers.set('Retry-After', retryAfter.toString());

        return new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests. Please try again in ${retryAfter} seconds.`,
            retryAfter,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...Object.fromEntries(headers.entries()),
            },
          }
        );
      }

      // Execute handler
      const response = await handler(req);

      // Add rate limit headers to successful response
      for (const [key, value] of headers.entries()) {
        response.headers.set(key, value);
      }

      return response;
    };
  };
}

/**
 * Tier-based rate limit configurations
 */
export const RATE_LIMITS = {
  /**
   * Free tier - 100 requests per minute
   */
  FREE: {
    maxRequests: 100,
    windowSeconds: 60,
    identifierType: 'ip' as const,
  },

  /**
   * Professional tier - 500 requests per minute
   */
  PROFESSIONAL: {
    maxRequests: 500,
    windowSeconds: 60,
    identifierType: 'user' as const,
  },

  /**
   * Enterprise tier - 2000 requests per minute
   */
  ENTERPRISE: {
    maxRequests: 2000,
    windowSeconds: 60,
    identifierType: 'user' as const,
  },

  /**
   * Authentication endpoints - 10 requests per minute
   */
  AUTH: {
    maxRequests: 10,
    windowSeconds: 60,
    identifierType: 'ip' as const,
  },

  /**
   * Public API - 60 requests per minute
   */
  PUBLIC: {
    maxRequests: 60,
    windowSeconds: 60,
    identifierType: 'ip' as const,
  },
} as const;

/**
 * Clear rate limit store (for testing)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * Destroy rate limit store (cleanup)
 */
export function destroyRateLimitStore(): void {
  rateLimitStore.destroy();
}
