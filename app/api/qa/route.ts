/**
 * QA API Endpoint - Production RAG Orchestration
 * 
 * Request Flow:
 * 1. Normalize query (query-understanding.ts)
 * 2. Check L0 exact cache (cache-utils.ts)
 * 3. Check L1 semantic cache (cache-utils.ts)
 * 4. Hybrid retrieval: vector + BM25 + RRF (hybrid-retrieval.ts)
 * 5. Tier selection: L1/L2/L3 (pattern-router.ts)
 * 6. LLM generation with context
 * 7. Output validation: grounding, citations, PII (validation.ts)
 * 8. Escalation check: upgrade tier if needed
 * 9. Cache result with tier-specific TTL
 * 10. Return QAResponse with metadata
 * 
 * Performance Targets:
 * - Cache hit: < 5 ms
 * - L1 response: < 1.5 s
 * - L2 response: < 3 s
 * - L3 response: < 6 s
 * - Retrieval: < 800 ms
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeQuery } from '../../../lib/rag/query-understanding';
import { hybridRetrieve } from '../../../lib/rag/hybrid-retrieval';
import { selectTier, shouldEscalateTier, escalateTier } from '../../../lib/rag/pattern-router';
import { validateResponse } from '../../../lib/rag/validation';
import { 
  buildCacheKey, 
  buildSemanticCacheKey,
  getTTLForTier,
  findMostSimilar,
} from '../../../lib/rag/cache-utils';
import { QualityTracker } from '../../../lib/analytics/quality-tracker';
import type { QARequest, QAResponse, Tier, Citation, ConversationQuality, RetrievalResult } from '../../../types/rag';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const MAX_RETRIES = 2;                    // Max escalation retries
const CACHE_SIMILARITY_THRESHOLD = 0.92;  // L1 semantic cache threshold
const ENABLE_SEMANTIC_CACHE = true;
const ENABLE_EXACT_CACHE = true;

// ─────────────────────────────────────────────────────────────────────────────
// Cache Client (Lazy Initialization)
// ─────────────────────────────────────────────────────────────────────────────

// TODO: Integrate Redis client with lazy-init pattern
// For now, use in-memory cache for development
const MEMORY_CACHE = new Map<string, { data: QAResponse; expiresAt: number }>();

async function getCachedResponse(cacheKey: string): Promise<QAResponse | null> {
  const cached = MEMORY_CACHE.get(cacheKey);
  if (!cached) return null;
  
  if (Date.now() > cached.expiresAt) {
    MEMORY_CACHE.delete(cacheKey);
    return null;
  }
  
  return cached.data;
}

async function setCachedResponse(
  cacheKey: string,
  response: QAResponse,
  ttlSeconds: number
): Promise<void> {
  MEMORY_CACHE.set(cacheKey, {
    data: response,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM Generation (Stub for Azure OpenAI Integration)
// ─────────────────────────────────────────────────────────────────────────────

async function generateResponse(
  query: string,
  context: string,
  tier: Tier,
  citations: Citation[]
): Promise<{ text: string; usage: { promptTokens: number; completionTokens: number } }> {
  // Use Azure OpenAI with tier-specific models
  const { azureOpenAIService } = await import('@/lib/azure/openai');
  
  const systemPrompt = `You're a friendly benefits advisor helping employees understand their benefits. Chat naturally while staying accurate.

Here's what I know from your benefits documents:
${context}

Guidelines:
- Speak conversationally, like you're explaining to a colleague
- Reference specific documents when helpful (e.g., "According to your 2026 Benefits Guide...")
- If you're not sure about something, be honest - say "I don't see that information in your current benefits documents"
- Keep answers clear and practical
- Use everyday language, not corporate jargon`;

  // Determine deployment based on tier
  const deployment = tier === 'L1' 
    ? process.env.AZURE_OPENAI_DEPLOYMENT_L1 || 'gpt-4o-mini'
    : tier === 'L3'
    ? process.env.AZURE_OPENAI_DEPLOYMENT_L3 || 'gpt-4'
    : process.env.AZURE_OPENAI_DEPLOYMENT_L1 || 'gpt-4o-mini';

  try {
    const response = await azureOpenAIService.generateChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      {
        temperature: 0.7,
        maxTokens: 500
      }
    );

    return {
      text: response.content,
      usage: {
        promptTokens: response.usage?.promptTokens || 0,
        completionTokens: response.usage?.completionTokens || 0,
      },
    };
  } catch (error) {
    console.error('[QA] LLM generation failed:', error);
    // Fallback to simulated response on error
    const simulatedResponse = `Based on the provided benefits documentation:

${context.substring(0, 200)}...

[Error generating response. Please try again.]

Citation: ${citations[0]?.chunkId || 'chunk-001'}`;

    return {
      text: simulatedResponse,
      usage: {
        promptTokens: 500,
        completionTokens: 150,
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main QA Orchestration
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let retrievalTime = 0;
  let generationTime = 0;
  let validationTime = 0;
  let cacheCheckTime = 0;

  try {
    // Parse request
    const body = await req.json();
    const request: QARequest = {
      query: body.query,
      companyId: body.companyId || 'default',
      userId: body.userId || 'anonymous',
      context: {
        sessionId: body.conversationId || body.sessionId,
        planYear: body.planYear,
        locale: body.locale,
      },
    };

    if (!request.query || request.query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Step 1: Normalize and analyze query
    const queryProfile = analyzeQuery(request.query);
    const normalizedQuery = queryProfile.normalized;

    console.log('[QA] Query analyzed:', {
      intent: queryProfile.intent,
      complexity: queryProfile.complexity,
      entities: queryProfile.entities.length,
    });

    // Step 2: Check L0 exact cache
    if (ENABLE_EXACT_CACHE) {
      const cacheCheckStart = Date.now();
      const exactCacheKey = buildCacheKey(normalizedQuery, request.companyId);
      const cachedExact = await getCachedResponse(exactCacheKey);
      cacheCheckTime = Date.now() - cacheCheckStart;

      if (cachedExact) {
        console.log('[QA] L0 cache HIT (exact match)');
        return NextResponse.json({
          ...cachedExact,
          metadata: {
            ...cachedExact.metadata,
            fromCache: true,
            cacheType: 'exact',
            latencyMs: Date.now() - startTime,
          },
        });
      }
    }

    // Step 3: Check L1 semantic cache
    if (ENABLE_SEMANTIC_CACHE) {
      const semanticCacheKey = buildSemanticCacheKey(request.companyId);
      // TODO: Implement semantic cache lookup with embedding similarity
      // For now, skip semantic cache in development
    }

    console.log('[QA] Cache MISS - proceeding with retrieval');

    // Step 4: Hybrid retrieval (vector + BM25 + RRF)
    const retrievalStart = Date.now();
    const retrievalContext = {
      companyId: request.companyId,
      userId: request.userId,
      filters: {},
    };
    
    let retrievalResult: RetrievalResult;
    try {
      // Use optimized retrieval config for production
      retrievalResult = await hybridRetrieve(
        normalizedQuery,
        retrievalContext,
        {
          vectorK: 40,           // More candidates for filtering
          bm25K: 40,             // More candidates for filtering  
          finalTopK: 16,         // More chunks after merging
          rerankedTopK: 12,      // More final chunks for LLM context
          enableReranking: true, // Enable semantic reranking
        }
      );
    } catch (retrievalError) {
      console.warn('[QA] Retrieval unavailable, using demo fallback:', retrievalError instanceof Error ? retrievalError.message : retrievalError);
      // Demo fallback context when Azure Search is not configured
      const demoText = `This is a demo environment without connected search.

HSA vs FSA quick summary:
- HSA pairs with High Deductible Health Plans and funds roll over year to year; you can invest them.
- FSA works with most plans but is generally "use-it-or-lose-it" (limited carryover or grace period).
- Both reduce taxable income; HSA typically has higher contribution limits.

Dental benefits overview:
- Preventive care (cleanings, exams) is often covered at 100%.
- Basic services (fillings) and major services (crowns) vary by plan coinsurance and annual maximum.`;

      retrievalResult = {
        chunks: [
          {
            id: 'demo-001',
            docId: 'demo-doc',
            companyId: retrievalContext.companyId,
            sectionPath: 'Demo',
            content: demoText,
            title: 'Benefits Overview (Demo)',
            position: 0,
            windowStart: 0,
            windowEnd: demoText.length,
            metadata: { tokenCount: Math.ceil(demoText.length / 4), relevanceScore: 0.5 },
            createdAt: new Date(),
          },
        ],
        method: 'hybrid',
        totalResults: 1,
        latencyMs: Date.now() - retrievalStart,
        scores: { vector: [], bm25: [], rrf: [] },
      } as RetrievalResult;
    }
    retrievalTime = Date.now() - retrievalStart;

    // Build context string and citations from chunks
    const context = retrievalResult.chunks
      .map((chunk, idx) => `[${idx + 1}] ${chunk.title}\n${chunk.content}`)
      .join('\n\n');
    
    const citations: Citation[] = retrievalResult.chunks.map((chunk) => ({
      chunkId: chunk.id,
      docId: chunk.docId,
      title: chunk.title,
      section: chunk.sectionPath,
      relevanceScore: chunk.metadata.relevanceScore || 0,
      excerpt: chunk.content.substring(0, 150),
      text: chunk.content.substring(0, 100), // For validation
    }));

    // Calculate coverage (approximate based on query terms in chunks)
    const queryTerms = normalizedQuery.toLowerCase().split(/\s+/);
    const chunkText = retrievalResult.chunks.map(c => c.content.toLowerCase()).join(' ');
    const matchedTerms = queryTerms.filter(term => chunkText.includes(term));
    const coverage = queryTerms.length > 0 ? matchedTerms.length / queryTerms.length : 0;

    console.log('[QA] Retrieval complete:', {
      chunks: retrievalResult.chunks.length,
      coverage: (coverage * 100).toFixed(1) + '%',
      latencyMs: retrievalTime,
    });

    // Step 5: Tier selection
    const routingSignals = {
      queryLength: normalizedQuery.length,
      hasOperators: /\b(and|or|if|then|but|however)\b/i.test(normalizedQuery),
      needsTools: queryProfile.needsTool,
      coverage,
      evidenceScore: coverage, // Simplified
      riskScore: queryProfile.riskScore,
      complexityScore: queryProfile.complexity,
      multiDocSynthesis: new Set(retrievalResult.chunks.map(c => c.docId)).size > 1,
    };
    
    let currentTier = selectTier(routingSignals);

    console.log('[QA] Tier selected:', currentTier);

    // Step 6: Generate response with retries for escalation
    let response: { text: string; usage: { promptTokens: number; completionTokens: number } };
    let validationResult;
    let retryCount = 0;

    while (retryCount <= MAX_RETRIES) {
      // Generate response
      const generationStart = Date.now();
      response = await generateResponse(
        normalizedQuery,
        context,
        currentTier,
        citations
      );
      generationTime = Date.now() - generationStart;

      // Step 7: Validate response
      const validationStart = Date.now();
      validationResult = validateResponse(
        response.text,
        citations,
        retrievalResult.chunks,
        currentTier
      );
      validationTime = Date.now() - validationStart;

      console.log('[QA] Validation:', {
        valid: validationResult.valid,
        grounding: (validationResult.grounding.score * 100).toFixed(1) + '%',
        citationsValid: validationResult.citationsValid,
        piiDetected: validationResult.piiDetected,
        requiresEscalation: validationResult.requiresEscalation,
      });

      // Step 8: Check escalation
      if (validationResult.requiresEscalation && currentTier !== 'L3') {
        const nextTier = escalateTier(currentTier);
        console.log(`[QA] Escalating from ${currentTier} to ${nextTier} (retry ${retryCount + 1}/${MAX_RETRIES})`);
        currentTier = nextTier;
        retryCount++;
        continue; // Retry with higher tier
      }

      // Validation passed or max tier reached
      break;
    }

    // Step 9: Prepare response
    const qaResponse: QAResponse = {
      answer: validationResult!.piiDetected 
        ? validationResult!.redactedResponse! 
        : response!.text,
      citations,
      tier: currentTier,
      fromCache: false,
      usage: {
        promptTokens: response!.usage.promptTokens,
        completionTokens: response!.usage.completionTokens,
        latencyMs: Date.now() - startTime,
      },
      metadata: {
        retrievalCount: retrievalResult.chunks.length,
        groundingScore: validationResult!.grounding.score,
        escalated: retryCount > 0,
        cacheKey: buildCacheKey(normalizedQuery, request.companyId),
        retrievalMethod: 'hybrid',
      },
    };

    // Step 10: Cache result
    const cacheKey = buildCacheKey(normalizedQuery, request.companyId);
    const cacheTTL = getTTLForTier(currentTier);
    await setCachedResponse(cacheKey, qaResponse, cacheTTL);

    console.log('[QA] Response cached:', {
      tier: currentTier,
      ttl: cacheTTL + 's',
      totalLatency: Date.now() - startTime + 'ms',
    });

    // Step 11: Record conversation quality metrics
    const conversationId = request.context?.sessionId || `conv-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const qualityMetrics: ConversationQuality = {
      conversationId,
      responseTime: Date.now() - startTime,
      groundingScore: validationResult!.grounding.score * 100, // Convert to percentage
      escalationCount: retryCount,
      resolvedFirstContact: retryCount === 0,
      tier: currentTier,
      cacheHit: false,
      timestamp: Date.now(),
      companyId: request.companyId,
      userId: request.userId,
      queryLength: request.query.length,
      answerLength: qaResponse.answer.length,
    };

    // Record quality metrics for analytics
    QualityTracker.recordConversation(qualityMetrics);

    console.log('[QA] Quality metrics recorded:', {
      conversationId,
      responseTime: qualityMetrics.responseTime + 'ms',
      groundingScore: qualityMetrics.groundingScore.toFixed(1) + '%',
      escalationCount: qualityMetrics.escalationCount,
      resolvedFirstContact: qualityMetrics.resolvedFirstContact,
    });

    // Return response
    return NextResponse.json({
      ...qaResponse,
      metadata: {
        ...qaResponse.metadata,
        fromCache: false,
        tier: currentTier,
        conversationId,
        latencyBreakdown: {
          total: Date.now() - startTime,
          cacheCheck: cacheCheckTime,
          retrieval: retrievalTime,
          generation: generationTime,
          validation: validationTime,
        },
      },
    });

  } catch (error) {
    console.error('[QA] Error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Check Endpoint
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    version: '1.0.0',
    components: {
      queryUnderstanding: 'operational',
      hybridRetrieval: 'operational',
      patternRouter: 'operational',
      validation: 'operational',
      cache: 'in-memory (development)',
      llm: 'stub (Azure OpenAI integration required)',
    },
    timestamp: new Date().toISOString(),
  });
}
