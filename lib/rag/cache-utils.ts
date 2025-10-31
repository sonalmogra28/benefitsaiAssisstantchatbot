/**
 * Cache utilities for Production RAG System
 * Implements L0 (exact) and L1 (semantic) caching strategies
 */

import { createHash } from "crypto";
import type {
  CacheEntry,
  CacheKeyType,
  CacheStrategy,
  QARequest,
  QAResponse,
  SemanticCacheEntry,
  Tier,
} from "../../types/rag";

// ============================================================================
// Cache Key Generation
// ============================================================================

/**
 * Normalize query for consistent cache keys
 * - Lowercase
 * - Trim whitespace
 * - Remove extra spaces
 * - Normalize unicode
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFKC");
}

/**
 * Generate SHA-256 hash of normalized query
 */
export function hashQuery(normalizedQuery: string): string {
  return createHash("sha256")
    .update(normalizedQuery)
    .digest("hex");
}

/**
 * Build L0 cache key (exact match)
 * Format: qa:v1:{companyId}:{queryHash}
 */
export function buildCacheKey(
  companyId: string,
  query: string,
  version: string = "v1"
): string {
  const normalized = normalizeQuery(query);
  const hash = hashQuery(normalized);
  return `qa:${version}:${companyId}:${hash}`;
}

/**
 * Build L1 cache key (recent queries for semantic match)
 * Format: recentq:v1:{companyId}
 */
export function buildSemanticCacheKey(
  companyId: string,
  version: string = "v1"
): string {
  return `recentq:${version}:${companyId}`;
}

/**
 * Build rate limit key
 * Format: ratelimit:{userId}:{window}
 */
export function buildRateLimitKey(
  userId: string,
  windowSeconds: number = 60
): string {
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / windowSeconds);
  return `ratelimit:${userId}:${window}`;
}

// ============================================================================
// TTL Strategy
// ============================================================================

/**
 * Get cache TTL based on tier
 */
export function getTTLForTier(tier: Tier): number {
  const TTL_MAP: Record<Tier, number> = {
    L1: 6 * 3600,    // 6 hours
    L2: 12 * 3600,   // 12 hours
    L3: 24 * 3600,   // 24 hours
  };
  return TTL_MAP[tier];
}

/**
 * Get cache TTL with jitter to prevent thundering herd
 */
export function getTTLWithJitter(
  baseTTL: number,
  jitterPercent: number = 10
): number {
  const jitter = baseTTL * (jitterPercent / 100);
  const randomJitter = Math.random() * jitter;
  return Math.floor(baseTTL + randomJitter - jitter / 2);
}

// ============================================================================
// Cache Entry Serialization
// ============================================================================

/**
 * Serialize QAResponse for cache storage
 */
export function serializeCacheEntry(
  response: QAResponse,
  queryHash: string,
  companyId: string
): string {
  const entry: CacheEntry = {
    answer: response.answer,
    citations: response.citations,
    tier: response.tier,
    timestamp: Date.now(),
    chunkIds: response.citations.map((c) => c.chunkId),
    queryHash,
    companyId,
  };
  return JSON.stringify(entry);
}

/**
 * Deserialize cache entry to QAResponse
 */
export function deserializeCacheEntry(cached: string): QAResponse {
  const entry: CacheEntry = JSON.parse(cached);
  return {
    answer: entry.answer,
    citations: entry.citations,
    tier: entry.tier,
    fromCache: true,
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: 0,
    },
  };
}

// ============================================================================
// Semantic Cache Utilities
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same dimension");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Find most similar query in semantic cache
 */
export function findMostSimilar(
  queryVector: number[],
  recentQueries: SemanticCacheEntry[],
  threshold: number = 0.92
): SemanticCacheEntry | null {
  let bestMatch: SemanticCacheEntry | null = null;
  let bestSimilarity = threshold;

  for (const entry of recentQueries) {
    const similarity = cosineSimilarity(queryVector, entry.queryVector);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = { ...entry, similarity };
    }
  }

  return bestMatch;
}

// ============================================================================
// Cache Strategy Helpers
// ============================================================================

/**
 * Determine if cache should be used for request
 */
export function shouldUseCache(
  request: QARequest,
  strategy: CacheStrategy
): { l0: boolean; l1: boolean } {
  // Don't cache if forceTier is set (testing/debugging)
  if (request.forceTier) {
    return { l0: false, l1: false };
  }

  // Don't cache streaming responses
  if (request.stream) {
    return { l0: false, l1: false };
  }

  return {
    l0: strategy.l0Enabled,
    l1: strategy.l1Enabled,
  };
}

/**
 * Determine if response should be cached
 */
export function shouldCacheResponse(
  response: QAResponse,
  strategy: CacheStrategy
): boolean {
  // Don't cache if already from cache
  if (response.fromCache) {
    return false;
  }

  // Don't cache low-quality responses (low grounding)
  if (response.metadata?.groundingScore && response.metadata.groundingScore < 0.5) {
    return false;
  }

  return true;
}

// ============================================================================
// Cache Invalidation
// ============================================================================

/**
 * Generate cache invalidation pattern for company
 * Returns pattern to match all company's cached queries
 */
export function buildInvalidationPattern(companyId: string): string {
  return `qa:*:${companyId}:*`;
}

/**
 * Generate cache invalidation pattern for specific document
 * Used when a document is updated/deleted
 */
export function buildDocumentInvalidationPattern(
  companyId: string,
  docId: string
): string {
  // Would need to store doc_id → cache_key mapping
  // For now, invalidate all company cache
  return buildInvalidationPattern(companyId);
}

// ============================================================================
// Cache Metrics
// ============================================================================

export interface CacheMetrics {
  l0Hits: number;
  l0Misses: number;
  l1Hits: number;
  l1Misses: number;
  totalRequests: number;
  avgL0LatencyMs: number;
  avgL1LatencyMs: number;
}

export class CacheMetricsCollector {
  private metrics: CacheMetrics = {
    l0Hits: 0,
    l0Misses: 0,
    l1Hits: 0,
    l1Misses: 0,
    totalRequests: 0,
    avgL0LatencyMs: 0,
    avgL1LatencyMs: 0,
  };

  recordL0Hit(latencyMs: number): void {
    this.metrics.l0Hits++;
    this.metrics.totalRequests++;
    this.updateAvgLatency("l0", latencyMs);
  }

  recordL0Miss(latencyMs: number): void {
    this.metrics.l0Misses++;
    this.metrics.totalRequests++;
    this.updateAvgLatency("l0", latencyMs);
  }

  recordL1Hit(latencyMs: number): void {
    this.metrics.l1Hits++;
    this.updateAvgLatency("l1", latencyMs);
  }

  recordL1Miss(latencyMs: number): void {
    this.metrics.l1Misses++;
    this.updateAvgLatency("l1", latencyMs);
  }

  private updateAvgLatency(type: "l0" | "l1", latencyMs: number): void {
    const key = type === "l0" ? "avgL0LatencyMs" : "avgL1LatencyMs";
    const total = type === "l0"
      ? this.metrics.l0Hits + this.metrics.l0Misses
      : this.metrics.l1Hits + this.metrics.l1Misses;

    this.metrics[key] = (this.metrics[key] * (total - 1) + latencyMs) / total;
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  getHitRate(): { l0: number; l1: number; overall: number } {
    const l0Total = this.metrics.l0Hits + this.metrics.l0Misses;
    const l1Total = this.metrics.l1Hits + this.metrics.l1Misses;
    const overallHits = this.metrics.l0Hits + this.metrics.l1Hits;

    return {
      l0: l0Total > 0 ? this.metrics.l0Hits / l0Total : 0,
      l1: l1Total > 0 ? this.metrics.l1Hits / l1Total : 0,
      overall: this.metrics.totalRequests > 0
        ? overallHits / this.metrics.totalRequests
        : 0,
    };
  }

  reset(): void {
    this.metrics = {
      l0Hits: 0,
      l0Misses: 0,
      l1Hits: 0,
      l1Misses: 0,
      totalRequests: 0,
      avgL0LatencyMs: 0,
      avgL1LatencyMs: 0,
    };
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const cacheMetrics = new CacheMetricsCollector();
