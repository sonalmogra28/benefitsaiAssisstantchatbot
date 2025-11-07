/**
 * Azure Search Index Health Monitoring
 * 
 * Validates index health at startup and provides auto-fallback to known-good index.
 * Prevents zero-result regressions by failing fast to logs.
 */

import { SearchIndexClient, AzureKeyCredential } from "@azure/search-documents";
import { logger } from "@/lib/logger";

const MIN_HEALTHY_DOC_COUNT = 10; // Threshold for healthy index
const FALLBACK_INDEX = "chunks_prod_v1"; // Known-good production index (499 docs)

let healthCheckAttempted = false;

/**
 * Ensure search index has sufficient documents
 * Auto-fallback to v1 if current index is unhealthy
 */
export async function ensureIndexHealthy(): Promise<void> {
  // Run once per server lifetime
  if (healthCheckAttempted) return;
  healthCheckAttempted = true;

  const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const apiKey = process.env.AZURE_SEARCH_API_KEY;
  const indexName = process.env.AZURE_SEARCH_INDEX || FALLBACK_INDEX;

  if (!endpoint || !apiKey) {
    logger.warn("[Search] Missing credentials; skipping health check");
    return;
  }

  try {
    const adminClient = new SearchIndexClient(
      endpoint,
      new AzureKeyCredential(apiKey)
    );

    const stats = await adminClient.getIndexStatistics(indexName);
    const docCount = stats?.documentCount ?? 0;

    if (docCount < MIN_HEALTHY_DOC_COUNT) {
      logger.error(
        { index: indexName, docCount, threshold: MIN_HEALTHY_DOC_COUNT },
        "[Search] Index UNHEALTHY; forcing fallback to v1"
      );
      
      // Override environment variable for current process
      process.env.AZURE_SEARCH_INDEX = FALLBACK_INDEX;
      
      logger.info(
        { fallbackIndex: FALLBACK_INDEX },
        "[Search] Auto-switched to fallback index"
      );
    } else {
      logger.info(
        { index: indexName, docCount },
        "[Search] Index health check PASSED"
      );
    }

  } catch (err) {
    logger.error(
      { index: indexName, err: String(err) },
      "[Search] Health check failed; forcing fallback to v1"
    );
    
    // Override to fallback on any stats failure
    process.env.AZURE_SEARCH_INDEX = FALLBACK_INDEX;
  }
}

/**
 * Get current active index name (post-fallback)
 */
export function getActiveIndexName(): string {
  return process.env.AZURE_SEARCH_INDEX || FALLBACK_INDEX;
}

/**
 * Check if using fallback index
 */
export function isUsingFallback(): boolean {
  return getActiveIndexName() === FALLBACK_INDEX;
}
