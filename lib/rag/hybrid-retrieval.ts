/**
 * Hybrid Retrieval System
 * Bootstrap Step 4: Vector + BM25 search with RRF merge and re-ranking
 */

import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import type { Chunk, RetrievalContext, RetrievalResult, HybridSearchConfig } from "../../types/rag";
import { isVitest } from '@/lib/ai/runtime';

// ============================================================================
// In-Memory Test Index (for Vitest)
// ============================================================================

type MemoryChunk = { id: string; text: string; embedding?: number[]; docId: string; companyId: string };
let memoryIndex: MemoryChunk[] = [];

export function __test_only_resetMemoryIndex() { 
  memoryIndex = []; 
}

export function __test_only_addToMemoryIndex(chunks: MemoryChunk[]) { 
  memoryIndex.push(...chunks); 
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const mag = Math.sqrt(magA) * Math.sqrt(magB);
  return mag === 0 ? 0 : dot / mag;
}

// ============================================================================
// Azure Search Client (Lazy Initialization)
// ============================================================================

let searchClient: any | null = null;

function ensureSearchClient(): any | null {
  if (searchClient) return searchClient;

  const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const apiKey = process.env.AZURE_SEARCH_API_KEY;
  // Production index locked to chunks_prod_v1 (499 docs). Do NOT use chunks_prod_v2 (3 test docs).
  const indexName = process.env.AZURE_SEARCH_INDEX || "chunks_prod_v1";

  // DIAGNOSTIC: Log which index we're actually using
  console.log(`[SEARCH] Initializing client with index: ${indexName} (env: ${process.env.AZURE_SEARCH_INDEX || 'NOT_SET'})`);

  if ((!endpoint || !apiKey) && !isVitest) {
    throw new Error("Azure Search credentials not configured");
  }
  
  if (!endpoint || !apiKey) {
    return null; // Vitest path: use in-memory index
  }

  searchClient = new SearchClient(
    endpoint,
    indexName,
    new AzureKeyCredential(apiKey)
  );

  return searchClient;
}

// ============================================================================
// Embedding Generation
// ============================================================================

/**
 * Generate embedding for query using Azure OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  // Use the real Azure OpenAI service
  const { azureOpenAIService } = await import('@/lib/azure/openai');
  return azureOpenAIService.generateEmbedding(text);
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

  // In-memory fallback for tests
  if (!client && isVitest) {
    const queryVector = await generateEmbedding(query);
    const filtered = memoryIndex.filter(c => c.companyId === context.companyId);
    const scored = filtered
      .map(c => ({ 
        chunk: c, 
        score: cosineSimilarity(queryVector, c.embedding || []) 
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
    
    return scored.map(s => ({
      id: s.chunk.id,
      docId: s.chunk.docId,
      companyId: s.chunk.companyId,
      sectionPath: "",
      content: s.chunk.text,
      title: "",
      position: 0,
      windowStart: 0,
      windowEnd: s.chunk.text.length,
      metadata: { tokenCount: Math.ceil(s.chunk.text.length / 4), vectorScore: s.score },
      createdAt: new Date(),
    }));
  }

  if (!client) {
    throw new Error("Azure Search client not available");
  }

  try {
    // Generate query embedding
    const queryVector = await generateEmbedding(query);

    // Build filter for company/context
    const filters: string[] = [`company_id eq '${context.companyId}'`];
    if (context.planYear) {
      filters.push(`benefit_year eq ${context.planYear}`);
    }
    const filterString = filters.join(" and ");

    // Execute vector search with semantic ranking
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
        "id",
        "document_id",
        "company_id",
        "chunk_index",
        "content",
        "metadata",
      ],
      semanticSearchOptions: {
        configurationName: "default",
        queryCaption: "extractive",
        captions: "extractive|highlight=true"
      },
      queryType: "semantic",
      semanticConfiguration: "default",
    });

    // Convert results to Chunk objects
    const chunks: Chunk[] = [];
    for await (const result of results.results) {
      const metadata = result.document.metadata ? JSON.parse(result.document.metadata) : {};
      chunks.push({
        id: result.document.id,
        docId: result.document.document_id,
        companyId: result.document.company_id,
        sectionPath: metadata.fileName || "",
        content: result.document.content,
        title: metadata.title || metadata.fileName || "",
        position: result.document.chunk_index || 0,
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

  // In-memory fallback for tests (simple keyword matching)
  if (!client && isVitest) {
    const filtered = memoryIndex.filter(c => c.companyId === context.companyId);
    const queryLower = query.toLowerCase();
    const scored = filtered
      .map(c => ({
        chunk: c,
        score: c.text.toLowerCase().split(queryLower).length - 1, // Count keyword occurrences
      }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
    
    return scored.map(s => ({
      id: s.chunk.id,
      docId: s.chunk.docId,
      companyId: s.chunk.companyId,
      sectionPath: "",
      content: s.chunk.text,
      title: "",
      position: 0,
      windowStart: 0,
      windowEnd: s.chunk.text.length,
      metadata: { tokenCount: Math.ceil(s.chunk.text.length / 4), bm25Score: s.score },
      createdAt: new Date(),
    }));
  }

  if (!client) {
    throw new Error("Azure Search client not available");
  }

  try {
    // Build filter
    const filters: string[] = [`company_id eq '${context.companyId}'`];
    if (context.planYear) {
      filters.push(`benefit_year eq ${context.planYear}`);
    }
    const filterString = filters.join(" and ");

    // Execute BM25 search with semantic ranking capability
    const results = await client.search(query, {
      searchMode: "all",
      queryType: "full",
      searchFields: ["content"],
      filter: filterString,
      top: k,
      select: [
        "id",
        "document_id",
        "company_id",
        "chunk_index",
        "content",
        "metadata",
      ],
    });

    // Convert results to Chunk objects
    const chunks: Chunk[] = [];
    for await (const result of results.results) {
      const metadata = result.document.metadata ? JSON.parse(result.document.metadata) : {};
      chunks.push({
        id: result.document.id,
        docId: result.document.document_id,
        companyId: result.document.company_id,
        sectionPath: metadata.fileName || "",
        content: result.document.content,
        title: metadata.title || metadata.fileName || "",
        position: result.document.chunk_index || 0,
        windowStart: 0,
        windowEnd: result.document.content.length,
        metadata: {
          tokenCount: metadata.tokenCount || Math.ceil(result.document.content.length / 4),
          bm25Score: result.score,
          ...metadata,
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
 * 
 * IMPORTANT: Deduplicates first, then slices only once at the end
 */
export function rrfMerge(
  resultSets: Chunk[][],
  k: number = 60,
  topN: number = 12
): Chunk[] {
  const id = (c: Chunk) => c.id ?? `${c.docId}:${c.position ?? 0}`;
  const scores = new Map<string, { chunk: Chunk; score: number }>();

  // Calculate RRF scores for each chunk across all result sets (do NOT slice before merge)
  for (const results of resultSets) {
    results.forEach((chunk, rank) => {
      const key = id(chunk);
      const rrfScore = 1 / (k + rank + 1); // rank is 0-indexed
      const existing = scores.get(key);

      if (existing) {
        existing.score += rrfScore;
      } else {
        scores.set(key, {
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

  // Deduplicate and sort by RRF score, then slice only once at end
  const merged = Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ chunk, score }) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        rrfScore: score,
        relevanceScore: score, // Use RRF as relevance
      },
    }))
    .slice(0, topN);  // ONLY slice here, after merge and dedupe

  console.log(`[RRF] Merged ${Array.from(scores.values()).length} unique chunks → top ${merged.length}`);
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

  // Default configuration - OPTIMIZED for production
  const cfg: HybridSearchConfig = {
    vectorK: config?.vectorK ?? 40,          // Increased from 24 to 40 for better filtering
    bm25K: config?.bm25K ?? 40,              // Increased from 24 to 40 for better filtering
    rrfK: config?.rrfK ?? 60,
    finalTopK: config?.finalTopK ?? 16,      // Increased from 12 to 16 for more context
    rerankedTopK: config?.rerankedTopK ?? 12, // Increased from 8 to 12 for more grounding
    enableReranking: config?.enableReranking ?? false,
  };

  try {
    // Execute vector and BM25 searches in parallel
    const [vectorResults, bm25Results] = await Promise.all([
      retrieveVectorTopK(query, context, cfg.vectorK),
      retrieveBM25TopK(query, context, cfg.bm25K),
    ]);

    console.log(`[RAG] v=${vectorResults.length} b=${bm25Results.length} (requested k=${cfg.vectorK})`);

    // Merge using RRF
    const merged = rrfMerge(
      [vectorResults, bm25Results],
      cfg.rrfK,
      cfg.finalTopK
    );

    console.log(`[RAG] merged=${merged.length} (after RRF dedupe)`);

    // Re-rank if enabled
    const final = cfg.enableReranking
      ? await rerankChunks(query, merged, cfg.rerankedTopK)
      : merged.slice(0, cfg.rerankedTopK);

    console.log(`[RAG] final=${final.length} (reranking=${cfg.enableReranking})`);

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
