/**
 * Hybrid Retrieval System
 * Bootstrap Step 4: Vector + BM25 search with RRF merge and re-ranking
 */

import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import type { Chunk, RetrievalContext, RetrievalResult, HybridSearchConfig } from "../../types/rag";

// ============================================================================
// Azure Search Client (Lazy Initialization)
// ============================================================================

let searchClient: SearchClient<any> | null = null;

function ensureSearchClient(): SearchClient<any> {
  if (searchClient) return searchClient;

  const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const apiKey = process.env.AZURE_SEARCH_API_KEY;
  const indexName = process.env.AZURE_SEARCH_INDEX_NAME || "chunks_prod_v1";

  if (!endpoint || !apiKey) {
    throw new Error("Azure Search credentials not configured");
  }

  searchClient = new SearchClient(
    endpoint,
    indexName,
    new AzureKeyCredential(apiKey)
  );

  return searchClient;
}

// ============================================================================
// Embedding Generation (Stub - will integrate with Azure OpenAI)
// ============================================================================

/**
 * Generate embedding for query
 * TODO: Integrate with Azure OpenAI text-embedding-ada-002
 */
async function generateEmbedding(text: string): Promise<number[]> {
  // Stub implementation - returns dummy vector
  // In production, call Azure OpenAI embeddings API
  console.warn("Using stub embedding - integrate Azure OpenAI in production");
  return new Array(1536).fill(0).map(() => Math.random());
}

// ============================================================================
// Vector Search
// ============================================================================

/**
 * Retrieve top-K chunks using vector similarity
 * Uses HNSW index with cosine distance
 */
export async function retrieveVectorTopK(
  query: string,
  context: RetrievalContext,
  k: number = 24
): Promise<Chunk[]> {
  const client = ensureSearchClient();
  const startTime = Date.now();

  try {
    // Generate query embedding
    const queryVector = await generateEmbedding(query);

    // Build filter for company/context
    const filters: string[] = [`company_id eq '${context.companyId}'`];
    if (context.planYear) {
      filters.push(`benefit_year eq ${context.planYear}`);
    }
    const filterString = filters.join(" and ");

    // Execute vector search
    const results = await client.search(query, {
      vectorSearchOptions: {
        queries: [{
          kind: "vector",
          vector: queryVector,
          fields: ["content_vector"],
          kNearestNeighborsCount: k,
        }],
      },
      filter: filterString,
      top: k,
      select: [
        "chunk_id",
        "doc_id",
        "company_id",
        "section_path",
        "content",
        "title",
        "metadata",
      ],
    });

    // Convert results to Chunk objects
    const chunks: Chunk[] = [];
    for await (const result of results.results) {
      chunks.push({
        id: result.document.chunk_id,
        docId: result.document.doc_id,
        companyId: result.document.company_id,
        sectionPath: result.document.section_path || "",
        content: result.document.content,
        title: result.document.title,
        position: 0, // Not stored in index
        windowStart: 0,
        windowEnd: result.document.content.length,
        metadata: {
          tokenCount: Math.ceil(result.document.content.length / 4),
          vectorScore: result.score,
          ...parseMetadata(result.document.metadata),
        },
        createdAt: new Date(),
      });
    }

    const latencyMs = Date.now() - startTime;
    console.log(`Vector search: ${chunks.length} results in ${latencyMs}ms`);

    return chunks;
  } catch (error) {
    console.error("Vector search failed:", error);
    throw new Error(`Vector retrieval error: ${error}`);
  }
}

// ============================================================================
// BM25 Full-Text Search
// ============================================================================

/**
 * Retrieve top-K chunks using BM25 full-text search
 * Uses Azure Search built-in BM25 scoring
 */
export async function retrieveBM25TopK(
  query: string,
  context: RetrievalContext,
  k: number = 24
): Promise<Chunk[]> {
  const client = ensureSearchClient();
  const startTime = Date.now();

  try {
    // Build filter
    const filters: string[] = [`company_id eq '${context.companyId}'`];
    if (context.planYear) {
      filters.push(`benefit_year eq ${context.planYear}`);
    }
    const filterString = filters.join(" and ");

    // Execute BM25 search
    const results = await client.search(query, {
      searchMode: "all",
      queryType: "full",
      searchFields: ["content", "title", "section_path"],
      filter: filterString,
      top: k,
      select: [
        "chunk_id",
        "doc_id",
        "company_id",
        "section_path",
        "content",
        "title",
        "metadata",
      ],
    });

    // Convert results to Chunk objects
    const chunks: Chunk[] = [];
    for await (const result of results.results) {
      chunks.push({
        id: result.document.chunk_id,
        docId: result.document.doc_id,
        companyId: result.document.company_id,
        sectionPath: result.document.section_path || "",
        content: result.document.content,
        title: result.document.title,
        position: 0,
        windowStart: 0,
        windowEnd: result.document.content.length,
        metadata: {
          tokenCount: Math.ceil(result.document.content.length / 4),
          bm25Score: result.score,
          ...parseMetadata(result.document.metadata),
        },
        createdAt: new Date(),
      });
    }

    const latencyMs = Date.now() - startTime;
    console.log(`BM25 search: ${chunks.length} results in ${latencyMs}ms`);

    return chunks;
  } catch (error) {
    console.error("BM25 search failed:", error);
    throw new Error(`BM25 retrieval error: ${error}`);
  }
}

// ============================================================================
// Reciprocal Rank Fusion (RRF)
// ============================================================================

/**
 * Merge multiple result sets using Reciprocal Rank Fusion
 * RRF formula: score(chunk) = Σ(1 / (k + rank))
 * where k is a constant (default 60) and rank is 0-indexed
 */
export function rrfMerge(
  resultSets: Chunk[][],
  k: number = 60,
  topN: number = 12
): Chunk[] {
  const scores = new Map<string, { chunk: Chunk; score: number }>();

  // Calculate RRF scores for each chunk across all result sets
  for (const results of resultSets) {
    results.forEach((chunk, rank) => {
      const existing = scores.get(chunk.id);
      const rrfScore = 1 / (k + rank + 1); // rank is 0-indexed

      if (existing) {
        existing.score += rrfScore;
      } else {
        scores.set(chunk.id, {
          chunk: {
            ...chunk,
            metadata: {
              ...chunk.metadata,
              rrfScore,
            },
          },
          score: rrfScore,
        });
      }
    });
  }

  // Sort by RRF score descending and take top N
  const merged = Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(({ chunk, score }) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        rrfScore: score,
        relevanceScore: score, // Use RRF as relevance
      },
    }));

  console.log(`RRF merge: ${scores.size} unique chunks → top ${merged.length}`);
  return merged;
}

// ============================================================================
// Re-ranking (Stub for Cross-Encoder)
// ============================================================================

/**
 * Re-rank chunks using cross-encoder model
 * TODO: Integrate with Azure ML cross-encoder or use Azure AI Search semantic ranking
 */
export async function rerankChunks(
  query: string,
  chunks: Chunk[],
  topN: number = 8
): Promise<Chunk[]> {
  // Stub implementation - in production, use:
  // 1. Azure AI Search semantic ranking (easier)
  // 2. Separate cross-encoder model (more control)
  
  console.warn("Using stub re-ranking - integrate cross-encoder in production");
  
  // For now, just return top N by existing score
  return chunks.slice(0, topN);
}

// ============================================================================
// Hybrid Retrieval (Main Entry Point)
// ============================================================================

/**
 * Execute hybrid retrieval: vector + BM25 + RRF merge + re-rank
 * Returns top-K most relevant chunks for query
 */
export async function hybridRetrieve(
  query: string,
  context: RetrievalContext,
  config?: Partial<HybridSearchConfig>
): Promise<RetrievalResult> {
  const startTime = Date.now();

  // Default configuration
  const cfg: HybridSearchConfig = {
    vectorK: config?.vectorK ?? 24,
    bm25K: config?.bm25K ?? 24,
    rrfK: config?.rrfK ?? 60,
    finalTopK: config?.finalTopK ?? 12,
    rerankedTopK: config?.rerankedTopK ?? 8,
    enableReranking: config?.enableReranking ?? false,
  };

  try {
    // Execute vector and BM25 searches in parallel
    const [vectorResults, bm25Results] = await Promise.all([
      retrieveVectorTopK(query, context, cfg.vectorK),
      retrieveBM25TopK(query, context, cfg.bm25K),
    ]);

    // Merge using RRF
    const merged = rrfMerge(
      [vectorResults, bm25Results],
      cfg.rrfK,
      cfg.finalTopK
    );

    // Re-rank if enabled
    const final = cfg.enableReranking
      ? await rerankChunks(query, merged, cfg.rerankedTopK)
      : merged.slice(0, cfg.rerankedTopK);

    const latencyMs = Date.now() - startTime;

    return {
      chunks: final,
      method: "hybrid",
      totalResults: vectorResults.length + bm25Results.length,
      latencyMs,
      scores: {
        vector: vectorResults.map((c) => c.metadata.vectorScore ?? 0),
        bm25: bm25Results.map((c) => c.metadata.bm25Score ?? 0),
        rrf: merged.map((c) => c.metadata.rrfScore ?? 0),
      },
    };
  } catch (error) {
    console.error("Hybrid retrieval failed:", error);
    throw error;
  }
}

// ============================================================================
// Context Building
// ============================================================================

/**
 * Build context window from retrieved chunks
 * Applies token budget and diversity constraints
 */
export function buildContext(
  chunks: Chunk[],
  maxTokens: number = 2000,
  diversityByDoc: boolean = true
): string {
  let context = "";
  let tokenCount = 0;
  const seenDocs = new Set<string>();

  for (const chunk of chunks) {
    // Diversity constraint: prefer chunks from different docs
    if (diversityByDoc && seenDocs.has(chunk.docId) && seenDocs.size < chunks.length / 2) {
      continue;
    }

    // Check token budget
    const chunkTokens = chunk.metadata.tokenCount || Math.ceil(chunk.content.length / 4);
    if (tokenCount + chunkTokens > maxTokens) {
      break;
    }

    // Add chunk to context
    context += `\n[Source: ${chunk.title} - ${chunk.sectionPath}]\n`;
    context += chunk.content;
    context += "\n";

    tokenCount += chunkTokens;
    seenDocs.add(chunk.docId);
  }

  console.log(`Context built: ${tokenCount} tokens from ${seenDocs.size} docs`);
  return context.trim();
}

/**
 * Calculate coverage: what % of query terms appear in top chunks
 */
export function calculateCoverage(query: string, chunks: Chunk[]): number {
  const queryTerms = new Set(
    query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 2)
  );

  if (queryTerms.size === 0) return 0;

  const allContent = chunks.map((c) => c.content.toLowerCase()).join(" ");
  let foundTerms = 0;

  for (const term of queryTerms) {
    if (allContent.includes(term)) {
      foundTerms++;
    }
  }

  return foundTerms / queryTerms.size;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse metadata JSON string from Azure Search
 */
function parseMetadata(metadataStr: string | undefined): Record<string, any> {
  if (!metadataStr) return {};
  try {
    return JSON.parse(metadataStr);
  } catch {
    return {};
  }
}

/**
 * Format retrieval result for logging
 */
export function formatRetrievalResult(result: RetrievalResult): string {
  return [
    `Method: ${result.method}`,
    `Chunks: ${result.chunks.length}`,
    `Latency: ${result.latencyMs}ms`,
    `Coverage: ${result.chunks.length > 0 ? "calculated separately" : "0%"}`,
  ].join(" | ");
}
