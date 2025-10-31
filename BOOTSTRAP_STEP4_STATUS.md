# 🎯 Bootstrap Step 4: Production RAG Architecture - STARTED

**Date:** October 31, 2025  
**Status:** 🚧 In Progress (Foundation Complete)  
**Objective:** Implement production-grade RAG with hybrid retrieval, tiered LLM routing, and intelligent caching

---

## Progress Summary

### ✅ Completed (Today)

1. **Architecture Documentation** (`BOOTSTRAP_STEP4_RAG_ARCHITECTURE.md`)
   - Complete system design (13 sections, 800+ lines)
   - Request flow diagram (normalize → cache → retrieve → route → generate → validate)
   - Ingestion pipeline spec (chunking, embeddings, indexing)
   - Two-layer cache strategy (L0 exact + L1 semantic)
   - Hybrid retrieval (vector + BM25 + RRF merge)
   - Tiered routing (L1/L2/L3 with deterministic rules)
   - Output validation & guardrails
   - Failure handling & fallbacks
   - Azure service bindings
   - Observability requirements

2. **Core Type Definitions** (`types/rag.ts`)
   - API contracts: `QARequest`, `QAResponse`, `Citation`
   - Document & chunk types with metadata
   - Retrieval types: `RetrievalContext`, `HybridSearchConfig`
   - Query understanding: `QueryIntent`, `Entity`, `IntentType`
   - Routing signals: `RoutingSignals`, `TierConfig`
   - Cache types: `CacheEntry`, `SemanticCacheEntry`, `CacheStrategy`
   - Validation types: `GroundingResult`, `PIIDetectionResult`
   - Error types: `RAGError`, `RetrievalError`, `GenerationError`
   - 400+ lines of production-grade TypeScript

3. **Cache Utilities** (`lib/rag/cache-utils.ts`)
   - Query normalization & hashing (SHA-256)
   - Cache key generation (L0 exact + L1 semantic)
   - TTL strategies with jitter (prevent thundering herd)
   - Serialization/deserialization
   - Cosine similarity calculation
   - Semantic cache similarity search
   - Cache metrics collector (hit rates, latency)
   - Invalidation pattern builders
   - 350+ lines with full implementation

**Commit:** `0825326` - "Bootstrap Step 4: Production RAG architecture - types and cache utils"

---

## Architecture Highlights

### 1. Request Flow (Runtime)

```
Client → POST /api/qa
  ↓
[Normalize + Rate Limit] → Redis check
  ↓
[Cache Lookup]
  L0: Exact match (hash-based, 6-24h TTL)
  L1: Semantic match (vector similarity ≥0.92)
  ↓
HIT? → Return cached answer
  ↓
MISS ↓
[Query Understanding] → Intent, entities, complexity
  ↓
[Hybrid Retrieval]
  - Vector search (K=24, cosine)
  - BM25 full-text (K=24)
  - Facet filters (year, carrier)
  → RRF merge → Top 12
  → Re-rank → Top 8
  ↓
[Pattern Router] → Tier selection
  Signals: coverage, evidence, tools, risk, complexity
  L1: Simple FAQ (gpt-4o-mini, 1.5s, 6h cache)
  L2: Multi-doc synthesis (gpt-4-turbo, 3s, 12h cache)
  L3: Complex/tools (gpt-4, 6s, 24h cache)
  ↓
[LLM Generate] → System prompt + context + citations
  ↓
[Validation & Guardrails]
  - Grounding check (≥70% sentences mapped)
  - PII/PHI redaction
  - Citation verification
  - Escalate L2→L3 if validation fails
  ↓
[Cache Write] → TTL by tier, with jitter
  ↓
Return response
```

### 2. Ingestion Pipeline (Offline)

```
Source Docs (PDF, DOCX, HTML, JSON, FAQs)
  ↓
[Text Extraction] → Per-type parsers
  ↓
[Clean & Normalize] → Unicode, whitespace, headers
  ↓
[Chunking] → Sliding window
  - Window: 800–1,200 tokens
  - Stride: 120–200 tokens
  - Preserve section headers
  - Attach: doc_id, section_path, position
  ↓
[Embeddings] → text-embedding-3-large
  - Batch: 16–32 chunks
  - Retry with exponential backoff
  ↓
[Index to Azure AI Search]
  - Vector field: HNSW, cosine, 1536 dims
  - Keyword fields: title, headings, body_ngrams
  - Filters: company_id, benefit_year, carrier
```

### 3. Tier Selection Logic

| Tier | Model | Use Case | Max Tokens | Timeout | Cache TTL |
|------|-------|----------|------------|---------|-----------|
| **L1** | `gpt-4o-mini` | FAQ-like, high confidence, single chunk | 1,200 | 1.5s | 6h |
| **L2** | `gpt-4-turbo` | Multi-chunk synthesis, moderate reasoning | 2,400 | 3s | 12h |
| **L3** | `gpt-4` | Complex, tools, calculations, low coverage | 4,000 | 6s | 24h |

**Routing Signals:**
- Query length, operators, tool requirements
- Coverage: % query terms in top-k
- Evidence score: Max confidence of best chunk
- Risk score: HR/compliance keywords
- Complexity: Multi-hop reasoning needed

**Deterministic Rules:**
```typescript
// L1: Simple
if (coverage > 0.85 && evidenceScore > 0.9 && !needsTools && queryLength < 200 && riskScore < 0.3)
  return "L1";

// L3: Complex
if (needsTools || coverage < 0.5 || riskScore > 0.7 || complexityScore > 0.8)
  return "L3";

// L2: Default (moderate)
return "L2";
```

### 4. Validation & Guardrails

**Grounding Check:**
- Split answer into sentences
- Map each sentence to retrieved chunks (semantic similarity > 0.75)
- Pass if ≥70% sentences mapped
- Escalate tier if validation fails

**PII/PHI Redaction:**
- Regex patterns: SSN, credit card, email, phone
- Lightweight NER for medical IDs
- Redact before cache write

**Citation Verification:**
- Ensure all cited `chunkId`s were in context set
- Error if citation references chunk not retrieved

---

## Implementation Status

### Phase 1: Foundation ✅ COMPLETE
- ✅ Architecture documentation (800+ lines)
- ✅ Type definitions (400+ lines)
- ✅ Cache utilities (350+ lines)
- ✅ Key generation, TTL strategies, similarity search
- ✅ Cache metrics collector

### Phase 2: Query Understanding (Next Up)
- ⬜ Query normalization (advanced)
- ⬜ Intent detection (heuristics + patterns)
- ⬜ Entity extraction (regex + lightweight NER)
- ⬜ Complexity scoring
- ⬜ Tool detection (math, table, API calls)

### Phase 3: Hybrid Retrieval
- ⬜ Azure AI Search client wrapper
- ⬜ Vector search implementation
- ⬜ BM25 full-text search
- ⬜ RRF (Reciprocal Rank Fusion) merge
- ⬜ Cross-encoder re-ranking (optional)
- ⬜ Context builder with token budgets

### Phase 4: Routing & Generation
- ⬜ Routing signal calculation
- ⬜ Tier selection logic
- ⬜ Model picker (per tier)
- ⬜ System prompt builder
- ⬜ LLM generation wrapper
- ⬜ Streaming support

### Phase 5: Validation
- ⬜ Grounding checker
- ⬜ PII/PHI detector & redactor
- ⬜ Citation validator
- ⬜ Tier escalation logic

### Phase 6: Main API
- ⬜ `/api/qa` endpoint
- ⬜ Request validation & normalization
- ⬜ Rate limiting
- ⬜ Cache lookup (L0 + L1)
- ⬜ Orchestration flow
- ⬜ Error handling & fallbacks
- ⬜ Response formatting

### Phase 7: Ingestion Pipeline
- ⬜ Document parsers (PDF, DOCX, HTML, JSON)
- ⬜ Text extraction & cleaning
- ⬜ Sliding window chunking
- ⬜ Batch embedding generation
- ⬜ Azure Search index management
- ⬜ Ingestion API endpoint

### Phase 8: Observability
- ⬜ Application Insights integration
- ⬜ Per-tier metrics (latency, cost, errors)
- ⬜ Cache hit rate tracking
- ⬜ Retrieval coverage metrics
- ⬜ Missing intent logging
- ⬜ Health check endpoint

---

## File Manifest

### Created (Committed)
- ✅ `BOOTSTRAP_STEP4_RAG_ARCHITECTURE.md` - Complete system design
- ✅ `types/rag.ts` - All TypeScript interfaces and types
- ✅ `lib/rag/cache-utils.ts` - Cache key generation and utilities

### Pending Creation
- ⬜ `lib/rag/query-understanding.ts` - Intent detection, entity extraction
- ⬜ `lib/rag/retrieval.ts` - Hybrid search (vector + BM25 + RRF)
- ⬜ `lib/rag/router.ts` - Tier selection logic
- ⬜ `lib/rag/generation.ts` - LLM wrapper with prompt building
- ⬜ `lib/rag/validation.ts` - Grounding, PII redaction, citations
- ⬜ `lib/rag/chunking.ts` - Sliding window chunker
- ⬜ `lib/rag/embedding.ts` - Batch embedding generation
- ⬜ `lib/rag/ingestion.ts` - Document parsers and pipeline
- ⬜ `app/api/qa/route.ts` - Main QA endpoint
- ⬜ `app/api/ingest/route.ts` - Ingestion endpoint
- ⬜ `app/api/health/route.ts` - Enhanced health check

---

## Azure Service Requirements

### Azure AI Search
**Index Schema:** `chunks_prod_v1`
- Fields: `chunk_id`, `doc_id`, `company_id`, `section_path`, `content`, `content_vector` (1536 dims)
- Vector config: HNSW, cosine, m=4, efConstruction=400
- Filters: `benefit_year`, `carrier`, `doc_type`

**Status:** ⬜ Index not yet created

### Redis Cache
**Key Patterns:**
- L0: `qa:v1:{companyId}:{queryHash}`
- L1: `recentq:v1:{companyId}`
- Rate limit: `ratelimit:{userId}:{window}`

**Status:** ✅ Connection string in `.env.production`

### Azure OpenAI
**Deployments Needed:**
- L1: `gpt-4o-mini` (fast, cheap)
- L2: `gpt-4-turbo` (moderate)
- L3: `gpt-4` (complex)
- Embedding: `text-embedding-ada-002` or `text-embedding-3-large`

**Status:** ⬜ Need to verify/create deployments

### Cosmos DB (Optional)
**Containers:**
- `documents` (pk: `/companyId`) - Doc registry, ACLs
- `chunks` (pk: `/docId`) - Chunk metadata

**Status:** ✅ Connection string available, schema TBD

---

## Next Actions (Prioritized)

### Immediate (This Session)
1. **Create Azure AI Search Index**
   - Run script to create `chunks_prod_v1` with vector config
   - Test vector search with sample embedding
   - Verify HNSW performance

2. **Implement Query Understanding Module**
   - Intent detection (FAQ vs comparison vs calculation)
   - Entity extraction (plan names, dates, amounts)
   - Complexity scoring heuristics
   - Tool detection logic

3. **Build Hybrid Retrieval System**
   - Wrap Azure Search client with retry/circuit breaker
   - Implement vector + BM25 parallel queries
   - RRF merge function
   - Context builder with token budgets

### Short-Term (Next Session)
4. **Routing & Generation**
   - Signal calculation from retrieval results
   - Tier selection implementation
   - LLM generation wrapper (with Azure OpenAI)
   - Prompt templates for system/user messages

5. **Validation Layer**
   - Grounding checker with sentence mapping
   - PII/PHI regex patterns + redaction
   - Citation verification
   - Tier escalation on validation failure

### Medium-Term (This Week)
6. **Main QA API Endpoint**
   - `/api/qa` route with full orchestration
   - Rate limiting integration
   - Cache lookup (L0 + L1)
   - Error handling & degradation

7. **Ingestion Pipeline**
   - Document parser selection (pdf-parse, mammoth, cheerio)
   - Sliding window chunker
   - Batch embedding with retry
   - Azure Search bulk upload

8. **Observability**
   - Application Insights custom events
   - Metrics dashboard queries
   - Health check with service status

---

## Technical Decisions Made

1. **Cache Strategy:** Two-layer (L0 exact + L1 semantic) with tier-based TTL
2. **Retrieval:** Hybrid (vector + BM25) with RRF merge, optional cross-encoder
3. **Routing:** Deterministic rules first, ML later if needed
4. **Validation:** Grounding check ≥70%, tier escalation on failure
5. **Timeouts:** Aggressive (1.5s/3s/6s) with fallback degradation
6. **Chunking:** Sliding window 800-1200 tokens, stride 120-200
7. **Embeddings:** text-embedding-3-large (or Azure ada-002)
8. **Vector Index:** Azure AI Search HNSW (not separate vector DB)

---

## Open Questions

1. **Cross-Encoder Re-ranking:** Deploy separate model or use Azure AI Search semantic ranking?
2. **BM25 Implementation:** Azure Search built-in vs local Lunr.js for fallback?
3. **Semantic Cache Storage:** Redis Vector extension or small Azure Search index?
4. **Document ACLs:** Store in Cosmos or embed in Azure Search metadata?
5. **Streaming Responses:** SSE implementation for L3 queries?

---

## Dependencies & Prerequisites

**Azure Resources (from Step 3):**
- ✅ Azure AI Search: `benefits-chatbot-search`
- ✅ Redis Cache: `benefits-chatbot-redis-dev`
- ✅ Azure OpenAI: `benefits-chatbot-openai2`
- ✅ Cosmos DB: `benefits-chatbot-cosmos-dev`
- ✅ Storage: `benefitschatbotdev`

**NPM Packages Needed:**
- ⬜ `@azure/search-documents` - Azure AI Search client
- ⬜ `pdf-parse` or `pdfjs-dist` - PDF text extraction
- ⬜ `mammoth` - DOCX to HTML/text
- ⬜ `cheerio` - HTML parsing
- ⬜ `tiktoken` - Token counting (OpenAI)
- ⬜ `zod` - Runtime validation
- ⬜ `applicationinsights` - Telemetry (already have)

**Environment Variables:**
- ✅ All Azure connection strings from Step 3
- ⬜ `AZURE_OPENAI_DEPLOYMENT_L1` (gpt-4o-mini)
- ⬜ `AZURE_OPENAI_DEPLOYMENT_L2` (gpt-4-turbo)
- ⬜ `AZURE_OPENAI_DEPLOYMENT_L3` (gpt-4)
- ⬜ `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`
- ⬜ `AZURE_SEARCH_INDEX_NAME` (chunks_prod_v1)

---

## Success Criteria (Step 4 Complete)

- [ ] All TypeScript types defined ✅ (DONE)
- [ ] Cache utilities implemented ✅ (DONE)
- [ ] Query understanding module working
- [ ] Hybrid retrieval functional (vector + BM25 + RRF)
- [ ] Tier routing logic implemented
- [ ] Validation & guardrails operational
- [ ] Main `/api/qa` endpoint deployed
- [ ] Ingestion pipeline functional
- [ ] Observability metrics flowing
- [ ] Test suite passing (unit + integration)
- [ ] Documentation complete
- [ ] Build passing without errors

---

**Status:** Foundation Complete (3/11 modules)  
**Next:** Query Understanding + Hybrid Retrieval  
**Timeline:** 1-2 weeks to production-ready RAG system

---

**Created by:** GitHub Copilot  
**Date:** October 31, 2025  
**Branch:** main  
**Commit:** `0825326`
