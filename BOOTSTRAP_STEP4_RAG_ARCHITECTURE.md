# Bootstrap Step 4: Production RAG Architecture

**Date:** October 31, 2025  
**Status:** 🚧 In Progress  
**Objective:** Implement production-grade RAG with hybrid retrieval, tiered LLM routing, and intelligent caching

---

## Architecture Overview

This document defines the complete production RAG (Retrieval-Augmented Generation) system for the Benefits AI Chatbot, implementing a sophisticated multi-tier approach with caching, hybrid search, and intelligent routing.

---

## 1. High-Level Request Flow (Runtime)

```
Client → POST /api/qa
  ↓
  [1] Normalize + Rate Limit (Redis)
  ↓
  [2] Cache Lookup
      L0: Exact match (hash-based)
      L1: Semantic match (vector similarity)
  ↓
  [3] On CACHE HIT → Return cached answer
  ↓
  [4] On CACHE MISS:
      ↓
      [4a] Query Understanding
           - Light parsing (entities, intent)
           - Heuristics (question type, complexity)
      ↓
      [4b] Retrieval (Hybrid)
           - Vector Search (K=24)
           - BM25 Search (K=24)
           - Facet Filters (year, carrier)
           → RRF Merge → Top 12
           → Re-rank → Top 8
      ↓
      [4c] Context Building
           - Deduplicate by doc_id
           - Trim to token budget
           - Attach metadata
      ↓
      [4d] Pattern Router → Tier Selection
           L1: Simple (FAQ-like, high confidence)
           L2: Moderate (multi-doc synthesis)
           L3: Complex (tools, calculations, low coverage)
      ↓
      [4e] LLM Generate
           - System policy prompt
           - Retrieved context
           - Citations embedded
      ↓
      [4f] Output Validation (Guardrails)
           - Grounding check (≥70% mapped to chunks)
           - PII/PHI redaction
           - Citation verification
           - Tier escalation if validation fails
      ↓
      [4g] Cache Write (TTL based on tier)
      ↓
  [5] Return response with citations
```

---

## 2. Ingestion Pipeline (Offline/On-Demand)

```
Source Documents
  (PDF, DOCX, HTML, JSON, FAQs)
  ↓
  [1] Text Extraction
      - PDF → pdfjs/pdf-parse
      - DOCX → mammoth
      - HTML → cheerio/htmlparser2
      - JSON → direct parse
  ↓
  [2] Clean & Normalize
      - Unicode normalization
      - Whitespace collapse
      - Section header preservation
      - Metadata extraction (title, author, date)
  ↓
  [3] Chunking (Sliding Window)
      - Window: 800–1,200 tokens
      - Stride: 120–200 tokens
      - Preserve section headers in each chunk
      - Attach: doc_id, section_path, position
  ↓
  [4] Embedding Generation
      - Model: text-embedding-3-large (OpenAI)
      - Azure equiv: text-embedding-ada-002 or custom
      - Batch size: 16–32 chunks
      - Retry with exponential backoff
  ↓
  [5] Index to Azure AI Search
      Schema:
        - chunk_id (string, key)
        - doc_id (string, filterable)
        - company_id (string, filterable)
        - section_path (string)
        - content (string, searchable)
        - content_vector (Collection(Edm.Single), vector)
        - title (string, searchable)
        - metadata (JSON)
        - created_at (DateTimeOffset)
      Vector Config:
        - Algorithm: HNSW
        - Distance: Cosine
        - Dimensions: 1536
```

---

## 3. Cache Strategy (Two Layers)

### L0: Exact Match Cache
**Purpose:** Avoid redundant processing for identical queries

```typescript
Key Format: `qa:v1:{companyId}:{sha256(normalize(query))}`

Value: {
  answer: string,
  citations: Citation[],
  tier: "L1"|"L2"|"L3",
  timestamp: number,
  chunkIds: string[]
}

TTL Strategy:
  - L1 answers: 6 hours
  - L2 answers: 12 hours
  - L3 answers: 24 hours
```

### L1: Semantic Match Cache
**Purpose:** Reuse answers for similar queries

```typescript
Key Format: `recentq:v1:{companyId}` → sorted set of query embeddings

Lookup Process:
  1. Embed incoming query
  2. ANN search over recent 1000 queries (Redis Vector or small index)
  3. If similarity ≥ 0.92 AND same scope (companyId, planYear)
     → Return cached answer with light re-grounding

TTL: Rolling window, expire entries >7 days old
```

---

## 4. Retrieval Strategy (Hybrid)

### Parallel Query Execution

```typescript
async function hybridRetrieve(query: string, context: Context): Promise<Chunk[]> {
  const [vectorResults, bm25Results, facetResults] = await Promise.all([
    // 1. Vector Search (cosine similarity)
    searchClient.search(query, {
      vectorQueries: [{
        kind: 'vector',
        vector: await embed(query),
        fields: ['content_vector'],
        kNearestNeighborsCount: 24
      }],
      filter: `company_id eq '${context.companyId}'`
    }),
    
    // 2. BM25 Full-Text Search
    searchClient.search(query, {
      searchMode: 'all',
      queryType: 'full',
      top: 24,
      filter: `company_id eq '${context.companyId}'`
    }),
    
    // 3. Filtered Facets (optional)
    searchClient.search(query, {
      facets: ['benefit_year', 'carrier', 'doc_type'],
      filter: buildFacetFilter(context)
    })
  ]);
  
  // Reciprocal Rank Fusion
  const merged = rrfMerge([vectorResults, bm25Results], k=60);
  const top12 = merged.slice(0, 12);
  
  // Re-rank with cross-encoder (optional)
  const reranked = await crossEncoderRerank(query, top12);
  return reranked.slice(0, 8);
}
```

### RRF (Reciprocal Rank Fusion)

```typescript
function rrfMerge(resultSets: Chunk[][], k = 60): Chunk[] {
  const scores = new Map<string, number>();
  
  for (const results of resultSets) {
    results.forEach((chunk, rank) => {
      const current = scores.get(chunk.id) || 0;
      scores.set(chunk.id, current + 1 / (k + rank + 1));
    });
  }
  
  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => findChunk(id));
}
```

---

## 5. Pattern Router (Tiered LLM Selection)

### Routing Signals

```typescript
interface RoutingSignals {
  queryLength: number;           // Character count
  hasOperators: boolean;         // "and", "or", "near:", site filters
  needsTools: boolean;           // Math, tables, API calls
  coverage: number;              // % of query terms in top-k (0-1)
  evidenceScore: number;         // Max confidence of best chunk
  riskScore: number;             // Compliance/HR keywords present
  complexityScore: number;       // Multi-hop reasoning needed
}
```

### Tier Selection Logic

```typescript
function routeTier(signals: RoutingSignals): Tier {
  // L1: Simple, high-confidence FAQ
  if (
    signals.coverage > 0.85 &&
    signals.evidenceScore > 0.9 &&
    !signals.needsTools &&
    signals.queryLength < 200 &&
    signals.riskScore < 0.3
  ) {
    return "L1";
  }
  
  // L3: Complex, low coverage, or tools required
  if (
    signals.needsTools ||
    signals.coverage < 0.5 ||
    signals.riskScore > 0.7 ||
    signals.complexityScore > 0.8
  ) {
    return "L3";
  }
  
  // L2: Moderate (default)
  return "L2";
}
```

### Tier Configuration

| Tier | Model | Max Tokens | Latency Budget | Use Case |
|------|-------|------------|----------------|----------|
| **L1** | `gpt-4o-mini` | 800–1,200 | 1,500 ms | FAQ-like, single-chunk answers |
| **L2** | `gpt-4-turbo` | 1,600–2,400 | 3,000 ms | Multi-chunk synthesis, moderate reasoning |
| **L3** | `o3` / `gpt-4.1` | 3,000–4,000 | 6,000 ms | Complex reasoning, tools, calculations |

---

## 6. API Contract

### Request Schema

```typescript
interface QARequest {
  companyId: string;              // Tenant/customer ID
  userId: string;                 // End user for audit
  query: string;                  // User's question
  context?: {
    persona?: "employee" | "hr" | "admin";
    planYear?: number;
    locale?: string;              // "en-US", "es-MX"
    sessionId?: string;
  };
  forceTier?: "L1" | "L2" | "L3"; // Override routing (testing)
  stream?: boolean;               // SSE streaming response
}
```

### Response Schema

```typescript
interface QAResponse {
  answer: string;                 // Generated response
  citations: Citation[];          // Source chunks
  tier: "L1" | "L2" | "L3";       // Selected tier
  fromCache: boolean;             // L0 or L1 cache hit
  usage: {
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
    cost?: number;                // Optional cost tracking
  };
  metadata?: {
    retrievalCount: number;       // Chunks retrieved
    groundingScore: number;       // % sentences mapped
    escalated: boolean;           // Tier escalation occurred
  };
}

interface Citation {
  chunkId: string;
  docId: string;
  title: string;
  section?: string;
  url?: string;
  relevanceScore: number;
}
```

---

## 7. Output Validation (Guardrails)

### Grounding Check

```typescript
async function validateGrounding(
  answer: string,
  chunks: Chunk[]
): Promise<{ ok: boolean; score: number }> {
  const sentences = splitSentences(answer);
  let mapped = 0;
  
  for (const sentence of sentences) {
    const hasEvidence = chunks.some(chunk =>
      semanticSimilarity(sentence, chunk.content) > 0.75 ||
      chunk.content.includes(extractKeyPhrase(sentence))
    );
    if (hasEvidence) mapped++;
  }
  
  const score = mapped / sentences.length;
  return { ok: score >= 0.70, score };
}
```

### PII/PHI Redaction

```typescript
function redactSensitiveInfo(text: string): string {
  const patterns = [
    /\b\d{3}-\d{2}-\d{4}\b/g,           // SSN
    /\b\d{16}\b/g,                       // Credit card
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // Email
    /\b\d{3}-\d{3}-\d{4}\b/g,           // Phone
  ];
  
  let redacted = text;
  for (const pattern of patterns) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  
  return redacted;
}
```

### Citation Verification

```typescript
function verifyCitations(
  answer: string,
  citations: Citation[],
  context: Chunk[]
): boolean {
  const citedIds = new Set(citations.map(c => c.chunkId));
  const contextIds = new Set(context.map(c => c.id));
  
  // All citations must be from context
  return Array.from(citedIds).every(id => contextIds.has(id));
}
```

---

## 8. Core Implementation

### Main QA Handler

```typescript
export async function handleQA(req: QARequest): Promise<QAResponse> {
  const startTime = Date.now();
  
  // [1] Normalize and rate limit
  const normalizedQuery = normalizeQuery(req.query);
  await rateLimitCheck(req.userId, req.companyId);
  
  // [2] Cache lookup (L0: exact)
  const cacheKey = buildCacheKey(req.companyId, normalizedQuery);
  const cached = await redis.get(cacheKey);
  if (cached) {
    return { ...JSON.parse(cached), fromCache: true };
  }
  
  // [2b] Cache lookup (L1: semantic)
  const semanticHit = await semanticCacheLookup(req.companyId, normalizedQuery);
  if (semanticHit && semanticHit.similarity > 0.92) {
    return { ...semanticHit.answer, fromCache: true };
  }
  
  // [3] Query understanding
  const intent = await analyzeQuery(normalizedQuery);
  
  // [4] Retrieval
  const retrieved = await hybridRetrieve(normalizedQuery, {
    companyId: req.companyId,
    planYear: req.context?.planYear,
    persona: req.context?.persona
  });
  
  // [5] Routing signals
  const signals = calculateRoutingSignals(normalizedQuery, retrieved, intent);
  let tier = req.forceTier || routeTier(signals);
  
  // [6] Context building
  let context = buildContext(retrieved, tier);
  
  // [7] LLM generation
  const model = getModelForTier(tier);
  const systemPrompt = buildSystemPrompt(req.companyId, req.context);
  let answer = await generateAnswer({
    model,
    systemPrompt,
    context,
    query: normalizedQuery,
    maxTokens: getMaxTokensForTier(tier),
    temperature: 0.2
  });
  
  // [8] Validation and escalation
  const grounding = await validateGrounding(answer.text, retrieved);
  if (!grounding.ok && tier !== "L3") {
    tier = "L3";
    const expanded = await hybridRetrieve(normalizedQuery, {
      ...req.context,
      companyId: req.companyId,
      topK: 12 // Expand retrieval
    });
    context = buildContext(expanded, tier);
    answer = await generateAnswer({
      model: getModelForTier("L3"),
      systemPrompt,
      context,
      query: normalizedQuery,
      maxTokens: 4000,
      temperature: 0.2
    });
  }
  
  // [9] Post-processing
  const finalAnswer = redactSensitiveInfo(answer.text);
  const citations = extractCitations(context);
  const citationsValid = verifyCitations(finalAnswer, citations, retrieved);
  
  if (!citationsValid) {
    throw new Error("Citation verification failed");
  }
  
  // [10] Build response
  const response: QAResponse = {
    answer: finalAnswer,
    citations,
    tier,
    fromCache: false,
    usage: {
      promptTokens: answer.usage.promptTokens,
      completionTokens: answer.usage.completionTokens,
      latencyMs: Date.now() - startTime
    },
    metadata: {
      retrievalCount: retrieved.length,
      groundingScore: grounding.score,
      escalated: tier === "L3" && !req.forceTier
    }
  };
  
  // [11] Cache write
  const ttl = getTTLForTier(tier);
  await redis.set(cacheKey, JSON.stringify(response), { EX: ttl });
  await updateSemanticCache(req.companyId, normalizedQuery, response);
  
  return response;
}
```

---

## 9. Azure Service Bindings

### Azure AI Search Index Schema

```json
{
  "name": "chunks_prod_v1",
  "fields": [
    { "name": "chunk_id", "type": "Edm.String", "key": true },
    { "name": "doc_id", "type": "Edm.String", "filterable": true },
    { "name": "company_id", "type": "Edm.String", "filterable": true },
    { "name": "section_path", "type": "Edm.String", "searchable": true },
    { "name": "content", "type": "Edm.String", "searchable": true },
    { 
      "name": "content_vector",
      "type": "Collection(Edm.Single)",
      "searchable": true,
      "vectorSearchDimensions": 1536,
      "vectorSearchProfileName": "vector-profile-1536"
    },
    { "name": "title", "type": "Edm.String", "searchable": true },
    { "name": "metadata", "type": "Edm.String" },
    { "name": "benefit_year", "type": "Edm.Int32", "filterable": true },
    { "name": "carrier", "type": "Edm.String", "filterable": true },
    { "name": "doc_type", "type": "Edm.String", "filterable": true },
    { "name": "created_at", "type": "Edm.DateTimeOffset" }
  ],
  "vectorSearch": {
    "profiles": [
      {
        "name": "vector-profile-1536",
        "algorithm": "hnsw-1536"
      }
    ],
    "algorithms": [
      {
        "name": "hnsw-1536",
        "kind": "hnsw",
        "hnswParameters": {
          "m": 4,
          "efConstruction": 400,
          "efSearch": 500,
          "metric": "cosine"
        }
      }
    ]
  }
}
```

### Environment Variables

```bash
# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://benefits-chatbot-search.search.windows.net
AZURE_SEARCH_API_KEY=<admin_key>
AZURE_SEARCH_INDEX_NAME=chunks_prod_v1

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://benefits-chatbot-openai2.openai.azure.com/
AZURE_OPENAI_API_KEY=<api_key>
AZURE_OPENAI_DEPLOYMENT_L1=gpt-4o-mini
AZURE_OPENAI_DEPLOYMENT_L2=gpt-4-turbo
AZURE_OPENAI_DEPLOYMENT_L3=gpt-4
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002

# Redis Cache
REDIS_URL=rediss://:key@host:6380
RATE_LIMIT_REDIS_URL=rediss://:key@host:6380

# Cosmos DB (optional, for doc registry)
AZURE_COSMOS_CONNECTION_STRING=AccountEndpoint=...

# Storage (ingestion)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
```

---

## 10. Timeouts & Budgets

```typescript
const TIMEOUT_BUDGETS = {
  retrieval: 2000,    // 2s for all parallel queries
  L1: 1500,           // 1.5s for simple queries
  L2: 3000,           // 3s for moderate
  L3: 6000,           // 6s for complex
};

const TOKEN_BUDGETS = {
  L1: { max: 1200, context: 800 },
  L2: { max: 2400, context: 1600 },
  L3: { max: 4000, context: 3000 },
};
```

### Timeout Handling

```typescript
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback?: T
): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );
  
  try {
    return await Promise.race([promise, timeout]);
  } catch (err) {
    if (fallback !== undefined) return fallback;
    throw err;
  }
}
```

---

## 11. Observability

### Metrics to Track

```typescript
interface Metrics {
  // Per-tier performance
  tierLatency: Record<Tier, Histogram>;
  tierCost: Record<Tier, Counter>;
  tierErrorRate: Record<Tier, Gauge>;
  
  // Cache performance
  cacheHitRateL0: Gauge;
  cacheHitRateL1: Gauge;
  cacheTTLExpiry: Counter;
  
  // Retrieval quality
  retrievalCoverage: Histogram;       // % query terms in results
  groundingScore: Histogram;          // % sentences mapped
  
  // Business metrics
  topMissingIntents: Counter;         // Queries with no good answer
  escalationRate: Gauge;              // L2→L3 escalations
  avgCitationsPerAnswer: Histogram;
}
```

### Application Insights Integration

```typescript
import { TelemetryClient } from 'applicationinsights';

const telemetry = new TelemetryClient(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING);

function trackQARequest(req: QARequest, res: QAResponse, err?: Error) {
  telemetry.trackRequest({
    name: 'QA Request',
    url: '/api/qa',
    duration: res.usage.latencyMs,
    resultCode: err ? 500 : 200,
    success: !err,
    properties: {
      companyId: req.companyId,
      tier: res.tier,
      fromCache: res.fromCache,
      escalated: res.metadata?.escalated,
      groundingScore: res.metadata?.groundingScore
    },
    measurements: {
      promptTokens: res.usage.promptTokens,
      completionTokens: res.usage.completionTokens,
      retrievalCount: res.metadata?.retrievalCount || 0
    }
  });
}
```

---

## 12. Failure Handling & Fallbacks

### Degradation Strategy

```typescript
async function handleQAWithFallbacks(req: QARequest): Promise<QAResponse> {
  try {
    return await handleQA(req);
  } catch (err) {
    // Azure Search down → fallback to BM25 only (local)
    if (isSearchServiceError(err)) {
      console.warn('Azure Search unavailable, using local BM25');
      return await handleQAWithLocalBM25(req);
    }
    
    // Redis down → continue without cache
    if (isRedisError(err)) {
      console.warn('Redis unavailable, proceeding without cache');
      return await handleQAWithoutCache(req);
    }
    
    // L3 timeout → fallback to L2 with warning
    if (isTierTimeout(err) && err.tier === 'L3') {
      console.warn('L3 timeout, degrading to L2');
      return await handleQA({ ...req, forceTier: 'L2' });
    }
    
    throw err;
  }
}
```

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold = 5,
    private timeout = 60000
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker open');
      }
    }
    
    try {
      const result = await fn();
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold) {
        this.state = 'open';
      }
      throw err;
    }
  }
}
```

---

## 13. Implementation Phases

### Phase 1: Foundation (Week 1)
- ✅ Type definitions and interfaces
- ✅ Cache key generation and Redis utilities
- ✅ Query normalization and intent detection
- ✅ Basic retrieval (vector-only)

### Phase 2: Hybrid Retrieval (Week 2)
- ⬜ BM25 implementation
- ⬜ RRF merge logic
- ⬜ Cross-encoder re-ranking
- ⬜ Context builder with token budgets

### Phase 3: Tiered Routing (Week 3)
- ⬜ Signal extraction (coverage, complexity, risk)
- ⬜ Routing logic implementation
- ⬜ Model selection per tier
- ⬜ Tier escalation on validation failure

### Phase 4: Validation & Safety (Week 4)
- ⬜ Grounding check implementation
- ⬜ PII/PHI redaction
- ⬜ Citation verification
- ⬜ Output guardrails

### Phase 5: Ingestion Pipeline (Week 5)
- ⬜ Document parsers (PDF, DOCX, HTML)
- ⬜ Chunking with sliding window
- ⬜ Batch embedding generation
- ⬜ Azure Search index creation/update

### Phase 6: Observability & Production (Week 6)
- ⬜ Application Insights integration
- ⬜ Metrics dashboard
- ⬜ Failure handling and circuit breakers
- ⬜ Load testing and optimization

---

## Next Steps

1. **Review architecture** with team/stakeholders
2. **Set up Azure Search index** with vector config
3. **Implement Phase 1** (types, cache, basic retrieval)
4. **Create sample documents** for testing ingestion
5. **Build Phase 2** (hybrid retrieval + RRF)

---

**Status:** Architecture defined, ready for implementation  
**Owner:** Development Team  
**Timeline:** 6 weeks to production-ready
