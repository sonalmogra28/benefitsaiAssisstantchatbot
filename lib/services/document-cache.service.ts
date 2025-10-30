import { redisService } from '@/lib/azure/redis';
import { logger } from '@/lib/logger';

export interface CachedDocumentChunk {
  id: string;
  content: string;
  documentId: string;
  chunkIndex: number;
  metadata?: any;
  score?: number;
}

export class DocumentCacheService {
  private readonly CACHE_PREFIX = 'doc_chunk:';
  private readonly SEARCH_PREFIX = 'doc_search:';
  private readonly TTL = 3600; // 1 hour

  /**
   * Cache document chunks for fast retrieval
   */
  async cacheDocumentChunks(
    companyId: string,
    documentId: string,
    chunks: CachedDocumentChunk[]
  ): Promise<void> {
    try {
      const key = `${this.CACHE_PREFIX}${companyId}:${documentId}`;
      await redisService.set(key, JSON.stringify(chunks), this.TTL);
      
      logger.info({
        companyId,
        documentId,
        chunkCount: chunks.length
      }, 'Document chunks cached');
    } catch (error) {
      logger.error({
        companyId,
        documentId,
        err: error as Error
      }, 'Failed to cache document chunks');
    }
  }

  /**
   * Get cached document chunks
   */
  async getCachedDocumentChunks(
    companyId: string,
    documentId: string
  ): Promise<CachedDocumentChunk[] | null> {
    try {
      const key = `${this.CACHE_PREFIX}${companyId}:${documentId}`;
      const cached = await redisService.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.error({
        companyId,
        documentId,
        err: error as Error
      }, 'Failed to get cached document chunks');
      return null;
    }
  }

  /**
   * Cache search results for common queries
   */
  async cacheSearchResults(
    companyId: string,
    query: string,
    results: CachedDocumentChunk[]
  ): Promise<void> {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      const key = `${this.SEARCH_PREFIX}${companyId}:${Buffer.from(normalizedQuery).toString('base64')}`;
      await redisService.set(key, JSON.stringify(results), this.TTL);
      
      logger.info({
        companyId,
        query: normalizedQuery,
        resultCount: results.length
      }, 'Search results cached');
    } catch (error) {
      logger.error({
        companyId,
        query,
        err: error as Error
      }, 'Failed to cache search results');
    }
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(
    companyId: string,
    query: string
  ): Promise<CachedDocumentChunk[] | null> {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      const key = `${this.SEARCH_PREFIX}${companyId}:${Buffer.from(normalizedQuery).toString('base64')}`;
      const cached = await redisService.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.error({
        companyId,
        query,
        err: error as Error
      }, 'Failed to get cached search results');
      return null;
    }
  }

  /**
   * Invalidate cache for a specific document
   */
  async invalidateDocumentCache(
    companyId: string,
    documentId: string
  ): Promise<void> {
    try {
      const key = `${this.CACHE_PREFIX}${companyId}:${documentId}`;
      await redisService.del(key);
      
      logger.info({
        companyId,
        documentId
      }, 'Document cache invalidated');
    } catch (error) {
      logger.error({
        companyId,
        documentId,
        err: error as Error
      }, 'Failed to invalidate document cache');
    }
  }

  /**
   * Clear all cache for a company
   */
  async clearCompanyCache(companyId: string): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}${companyId}:*`;
      const searchPattern = `${this.SEARCH_PREFIX}${companyId}:*`;
      
      // Get all keys matching the patterns
      const cacheKeys = await redisService.keys(pattern);
      const searchKeys = await redisService.keys(searchPattern);
      
      if (cacheKeys.length > 0) {
        for (const key of cacheKeys) {
          await redisService.del(key);
        }
      }
      
      if (searchKeys.length > 0) {
        for (const key of searchKeys) {
          await redisService.del(key);
        }
      }
      
      logger.info({
        companyId,
        cacheKeysDeleted: cacheKeys.length,
        searchKeysDeleted: searchKeys.length
      }, 'Company cache cleared');
    } catch (error) {
      logger.error({
        companyId,
        err: error as Error
      }, 'Failed to clear company cache');
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(companyId: string): Promise<{
    documentCaches: number;
    searchCaches: number;
    totalKeys: number;
  }> {
    try {
      const cachePattern = `${this.CACHE_PREFIX}${companyId}:*`;
      const searchPattern = `${this.SEARCH_PREFIX}${companyId}:*`;
      
      const cacheKeys = await redisService.keys(cachePattern);
      const searchKeys = await redisService.keys(searchPattern);
      
      return {
        documentCaches: cacheKeys.length,
        searchCaches: searchKeys.length,
        totalKeys: cacheKeys.length + searchKeys.length
      };
    } catch (error) {
      logger.error({
        companyId,
        err: error as Error
      }, 'Failed to get cache stats');
      return {
        documentCaches: 0,
        searchCaches: 0,
        totalKeys: 0
      };
    }
  }
}

export const documentCacheService = new DocumentCacheService();