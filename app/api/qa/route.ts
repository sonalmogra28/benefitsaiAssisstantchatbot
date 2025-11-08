export const dynamic = 'force-dynamic';
export const revalidate = 0;
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
import type { QARequest, QAResponse, Tier, Citation, ConversationQuality, RetrievalResult, Chunk } from '../../../types/rag';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const MAX_RETRIES = 2;                    // Max escalation retries
const CACHE_SIMILARITY_THRESHOLD = 0.92;  // L1 semantic cache threshold
const ENABLE_SEMANTIC_CACHE = true;
const ENABLE_EXACT_CACHE = true;

// ─────────────────────────────────────────────────────────────────────────────
// Cache Client (Safe Redis with Graceful Degradation)
// ─────────────────────────────────────────────────────────────────────────────

import { cacheGet, cacheSet, isCacheAvailable } from '@/lib/cache';
import { log } from '@/lib/logger';

async function getCachedResponse(cacheKey: string): Promise<QAResponse | null> {
  return cacheGet<QAResponse>(cacheKey);
}

async function setCachedResponse(
  cacheKey: string,
  response: QAResponse,
  ttlSeconds: number
): Promise<void> {
  await cacheSet(cacheKey, response, ttlSeconds);
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
  
  const systemPrompt = `You are a friendly benefits advisor colleague with deep knowledge of health insurance, retirement plans, and employee benefits. You're here to help in any circumstance, always approachable and knowledgeable.

Your style combines:
- Gemini's Friendliness: Warm, conversational, natural language - no corporate jargon
- ChatGPT's Helpfulness: Proactive, thorough, anticipates follow-up questions
- Claude's Intelligence: Precise, cites sources, acknowledges when uncertain

Your Knowledge Base:
${context}

Conversation Guidelines:

1. Write Naturally - Like a Helpful Colleague
   Talk like you're explaining something over coffee, not reading from a manual.
   
   Good: "Great question! Let me break down how dental coverage works. So basically, you've got two types of services..."
   
   Bad: "Dental coverage is structured as follows: (a) preventive services (b) basic services..."

2. Be Smart and Helpful
   - Compare options when relevant: "The HSA plan makes more sense if you're generally healthy because you'll save on premiums"
   - Point out hidden benefits: "Also, did you know preventive care is 100% covered? That means your annual checkup won't cost you anything"
   - Warn about gotchas: "Watch out though - FSA funds expire at year-end, unlike HSA which rolls over"

3. Be Proactive
   - Ask clarifying questions: "Are you looking at this just for yourself, or for your whole family?"
   - Suggest next steps: "Would you like me to help you compare the actual costs for your situation?"
   - Offer related info: "Since you're asking about dental, you might also want to know about vision coverage"

4. Stay Accurate
   - Reference specific documents: "According to your 2026 Benefits Guide, page 12..."
   - Use exact numbers: "The annual deductible is $1,500" (not "around $1,500")
   - If unsure, be honest: "I don't see that specific detail in your documents. Let me connect you with HR to get you the exact answer"

5. Format Clearly (but naturally)
   - Use simple bullet points or numbered lists for multiple items
   - Break long answers into short paragraphs (2-3 sentences max)
   - NO asterisks, NO bold formatting, NO markdown symbols
   - Just write naturally with proper spacing

6. Personalize Your Help
   - If they mention family size: "For a family of 4, you'd be looking at..."
   - Consider their health situation: "Since you mentioned you're generally healthy, the high deductible plan could save you money"
   - Remember context from earlier in the conversation

Example of Your Style:

Bad (robotic): "HSA eligibility requires enrollment in a High Deductible Health Plan (HDHP). Contributions are tax-deductible up to IRS limits."

Good (friendly colleague): "To use an HSA, you'll need to enroll in our High Deductible Health Plan first. Think of it as a package deal. The cool part? Every dollar you put in is tax-free (up to $4,150 for individuals in 2026), and unlike an FSA, the money rolls over year after year. Want me to walk through whether the HDHP makes sense for your situation?"

Remember: You're a helpful colleague, not a robot. Be warm, be smart, be useful. Help them in any circumstance. Never use asterisks or special formatting symbols in your responses.`;

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

import { ensureIndexHealthy } from '@/lib/rag/search-health';

// Run index health check once on first request
let healthCheckInitialized = false;

export async function POST(req: NextRequest) {
  // Ensure index is healthy before processing requests
  if (!healthCheckInitialized) {
    healthCheckInitialized = true;
    await ensureIndexHealthy().catch(err => {
      log.error('[QA] Index health check failed', err as Error);
    });
  }

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

    // DIAGNOSTIC: Log request details
    console.log('[QA][DEBUG] Request received:', {
      query: request.query,
      companyId: request.companyId,
      userId: request.userId,
      sessionId: request.context?.sessionId,
      hasBodyCompanyId: !!body.companyId,
      bodyCompanyId: body.companyId,
    });

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

    // Handle zero-results case (index corpus starvation)
    if (retrievalResult.chunks.length === 0) {
      log.warn('[QA] Zero retrieval results; returning fallback response', { query: normalizedQuery, companyId: request.companyId });
      
      const fallbackResponse: QAResponse = {
        answer: `I'm having trouble finding specific information about **"${normalizedQuery.substring(0, 100)}"** in our benefits documents right now.

Let me help you get the answer you need:

**Quick Fixes to Try**:
• Rephrase your question more specifically (e.g., "What dental benefits are covered?" instead of "dental info")
• Try a simpler question (e.g., "How do I enroll?" instead of "What's the enrollment process for new hires starting in Q2?")
• Ask about a different topic to test if it's working

**Common Questions I Can Help With**:
• "What health insurance plans are available?"
• "How much is the company contribution for health insurance?"
• "What's the difference between HSA and FSA?"
• "What dental and vision coverage do I have?"
• "How do I enroll in benefits?"

**Need More Help?**
If you keep seeing this message, it might mean:
- The specific detail you're asking about isn't in our current benefits documents
- There's a temporary system issue (our IT team has been notified)
- Your question needs personalized guidance from HR

📧 **Contact HR**: hr@amerivet.com | 📞 **Benefits Hotline**: 1-800-BENEFITS

*Tip: I work best with direct, simple questions about your benefits!* 😊`,
        citations: [],
        tier: 'L3',
        fromCache: false,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          latencyMs: Date.now() - startTime,
        },
        metadata: {
          retrievalCount: 0,
          groundingScore: 0,
          escalated: false,
          retrievalMethod: 'hybrid',
        },
      };

      // Negative-cache zero results briefly to avoid repeated heavy calls
      try {
        if (isCacheAvailable()) {
          const negKey = buildCacheKey(normalizedQuery, request.companyId);
          await setCachedResponse(negKey, fallbackResponse, 300); // 5 minutes
          log.info('[QA] Negative-cached zero-result fallback (300s)', { key: negKey });
        }
      } catch (err) {
        log.warn('[QA] Negative-cache write failed (non-blocking)', { err: String(err) });
      }

      return NextResponse.json(fallbackResponse);
    }

    // Deduplicate at chunk level (post-RRF)
    const keyOf = (c: Chunk) => c.id ?? `${c.docId}:${c.position ?? 0}`;
    const deduped = Array.from(
      new Map(retrievalResult.chunks.map(c => [keyOf(c), c])).values()
    );

    console.log(`[QA] Dedup: raw=${retrievalResult.chunks.length} unique=${deduped.length}`);

    // Show more, keep all for validation
    const SHOWN_CITATIONS = 12;
    const citationsToShow = deduped.slice(0, SHOWN_CITATIONS);

    // Build context string and citations from chunks
    const context = citationsToShow
      .map((chunk, idx) => `[${idx + 1}] ${chunk.title}\n${chunk.content}`)
      .join('\n\n');
    
    const citations: Citation[] = citationsToShow.map((chunk) => ({
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
        usedCount: deduped.length,
        shownCount: citationsToShow.length,
        groundingScore: validationResult!.grounding.score,
        escalated: retryCount > 0,
        cacheKey: buildCacheKey(normalizedQuery, request.companyId),
        retrievalMethod: 'hybrid',
        // NEW: Expose granular counts for diagnostics
        rawRetrievalCount: retrievalResult.chunks.length,
        dedupeCount: deduped.length,
        citationCount: citationsToShow.length,
      },
    };

    // Step 10: Cache result (async, non-blocking)
    const cacheKey = buildCacheKey(normalizedQuery, request.companyId);
    const cacheTTL = getTTLForTier(currentTier);

    // Only cache positive results when sufficiently grounded
    const canCache = (retrievalResult.chunks.length >= 8) && (validationResult!.grounding.score >= 0.60);

    if (cacheTTL > 0 && isCacheAvailable() && canCache) {
      setCachedResponse(cacheKey, qaResponse, cacheTTL).then(() => {
        log.info('[QA] Cache write completed', { tier: currentTier, ttl: `${cacheTTL}s` });
      }).catch(err => {
        log.warn('[QA] Cache write failed (non-blocking)', { err: String(err) });
      });
    } else if (!isCacheAvailable()) {
      log.debug('[QA] Cache unavailable; skipping write');
    } else if (!canCache) {
      log.debug('[QA] Skipping cache write (insufficient grounding or low retrieval)');
    }

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
