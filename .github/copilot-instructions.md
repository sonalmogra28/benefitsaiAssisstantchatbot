# Benefits AI Chatbot - AI Agent Instructions

## Architecture Overview

This is a **production-grade Next.js 15 (App Router) SaaS** for benefits automation with a sophisticated **RAG (Retrieval-Augmented Generation) system**. All secrets live in Vercel environment variables; deployments target Vercel exclusively.

### Core Technologies
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes, tRPC (type-safe APIs)
- **Azure Stack**: Cosmos DB, OpenAI, AI Search (vector), Blob Storage, Redis Cache
- **AI/RAG**: Hybrid retrieval (vector + BM25 + RRF), 3-tier LLM routing (L1/L2/L3), semantic caching
- **Auth**: Unified auth system with role-based permissions (5 roles: Super Admin → Employee)

## Critical Architectural Patterns

### 1. Build-Time Safety (`isBuild` Pattern)
**Why**: Azure SDK imports crash Next.js builds. Must defer initialization to runtime.

```typescript
// lib/runtime/is-build.ts
export const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

// Pattern: Conditional initialization
export const cosmosClient = isBuild() ? null : await getClient();
```

**Rule**: Never call Azure/IO-heavy code at module top-level. Use lazy initialization in functions or route handlers.

### 2. Singleton Service Pattern
Services are **class-based singletons** to maintain state and handle Azure client lifecycle:

```typescript
// lib/azure/redis.ts
export class RedisService { /* ... */ }
export const redisService = new RedisService(); // Export singleton

// lib/services/benefit-service.ts
class BenefitService { /* ... */ }
export const benefitService = new BenefitService();
```

**Import convention**: `import { benefitService } from '@/lib/services/benefit-service'`

### 3. RAG Pipeline (3-Tier Routing)
**Location**: `lib/rag/` (modular, pure functions + orchestration in `app/api/qa/route.ts`)

**Request flow** (`POST /api/qa`):
```
1. Query normalization (query-understanding.ts)
2. L0 cache (exact hash) → L1 cache (semantic similarity ≥0.92)
3. Cache MISS → Hybrid retrieval:
   - Vector search (Azure AI Search) K=24
   - BM25 full-text search K=24
   - RRF merge → Top 12 → Re-rank → Top 8
4. Pattern router calculates signals (coverage, complexity, risk)
5. Tier selection (L1: gpt-4o-mini, L2: gpt-4-turbo, L3: gpt-4)
6. LLM generation with context
7. Validation: grounding ≥70%, PII redaction, citation verification
8. Escalation if validation fails (L2→L3, max 2 retries)
9. Cache write (TTL: L1=6h, L2=12h, L3=24h)
10. Return QAResponse with metadata
```

**Key files**:
- `lib/rag/hybrid-retrieval.ts` - Vector + BM25 + RRF fusion
- `lib/rag/pattern-router.ts` - Tier selection logic
- `lib/rag/validation.ts` - Grounding, PII, citation checks
- `lib/rag/cache-utils.ts` - L0/L1 cache key generation

**Performance targets**: L1 <1.5s, L2 <3s, L3 <6s, Cache hit <5ms

### 4. Authentication & Authorization
**File**: `lib/auth/unified-auth.ts`

**5 Roles** (hierarchical permissions):
```typescript
SUPER_ADMIN > PLATFORM_ADMIN > COMPANY_ADMIN > HR_ADMIN > EMPLOYEE
```

**Pattern**: Higher-order function middleware
```typescript
import { requireCompanyAdmin, withAuth, PERMISSIONS } from '@/lib/auth/unified-auth';

// In API routes:
export const POST = requireCompanyAdmin(async (req, { user }) => {
  // user.roles, user.permissions, user.companyId available
});

// Custom permissions:
export const POST = withAuth(undefined, [PERMISSIONS.MANAGE_BENEFITS])(handler);
```

### 5. Environment Management
**File**: `config/environments.ts`

**3 Environments**: `development`, `staging`, `production`

```typescript
import { getConfig, isProduction, isFeatureEnabled } from '@/config/environments';

const config = getConfig(); // Auto-detects env from NEXT_PUBLIC_ENVIRONMENT
if (isFeatureEnabled('analytics')) { /* ... */ }
```

**Security config**: HTTPS, CSRF, rate limiting, session timeouts vary by env.

## Development Workflows

### Essential Commands
```bash
# Setup (first time)
cp .env.example .env.local
vercel env pull  # Populate from Vercel project (requires `vercel` CLI)
npm ci

# Development
npm run dev          # Port 8080 (Turbopack)
npm run typecheck    # Strict TypeScript validation
npm run lint         # ESLint
npm run build        # Production bundle (runs guard + typecheck + lint)
npm run test         # Vitest (unit + integration)

# Deployment
vercel               # Preview environment
vercel --prod        # Production (requires all env vars in Vercel dashboard)

# Load testing (requires k6 CLI installed)
npm run load:test    # Execute RAG scenarios (k6-rag-scenarios.js)
```

### Pre-Commit Checklist
```bash
npm run guard && npm run typecheck && npm run lint && npm run build
```

**Guard script** (`scripts/guard.ps1`): Blocks Git conflict markers, checks for type stubs in `types/stubs/`.

### Environment Variables
**All secrets managed via Vercel project settings**. Never commit `.env.local`.

**Required vars** (see `.env.example`):
- `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`
- `AZURE_COSMOS_ENDPOINT`, `AZURE_COSMOS_KEY`
- `AZURE_STORAGE_CONNECTION_STRING`
- `REDIS_URL`, `RATE_LIMIT_REDIS_URL`
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DOMAIN_ROOT`

## Code Conventions

### File Organization
```
app/                  # Next.js App Router (routes, layouts)
  api/                # API routes (Next.js handlers)
  (auth)/             # Auth-related pages
  (chat)/             # Chat UI
  admin/              # Admin dashboards
lib/                  # Business logic (services, utilities)
  rag/                # RAG pipeline (pure functions)
  azure/              # Azure SDK clients (lazy-init singletons)
  auth/               # Auth system
  services/           # Domain services (benefits, users, docs)
  db/cosmos/          # Cosmos DB repositories
components/           # React components (shadcn/ui + custom)
infra/azure/          # Bicep IaC for Azure resources
types/                # TypeScript type definitions
```

### Import Aliases
```typescript
import { ... } from '@/lib/...'       // lib/
import { ... } from '@/components/...' // components/
import { ... } from '@/app/...'        // app/
```

### Naming Patterns
- **Services**: `benefitService`, `userService` (singleton instances)
- **Repos**: `documentRepository`, `conversationsRepository`
- **Azure clients**: `azureOpenAIService`, `redisService`
- **Auth helpers**: `requireSuperAdmin`, `requireCompanyAdmin`, `withAuth`
- **RAG functions**: `analyzeQuery`, `hybridRetrieve`, `selectTier`, `validateResponse`

### API Route Structure
```typescript
// app/api/endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyAdmin } from '@/lib/auth/unified-auth';

export const POST = requireCompanyAdmin(async (req, { user }) => {
  try {
    const body = await req.json();
    // Validate, process, return
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Endpoint]', error);
    return NextResponse.json({ error: 'Message' }, { status: 500 });
  }
});
```

### tRPC Pattern (Type-Safe APIs)
**Location**: `lib/trpc/` (routers in `lib/trpc/routers/`)

```typescript
import { publicProcedure, router } from '@/lib/trpc/server';
import { z } from 'zod';

export const myRouter = router({
  getItem: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => { /* ... */ }),
});
```

**Client usage** (in React components):
```typescript
import { trpc } from '@/lib/trpc/client';

const { data } = trpc.myRouter.getItem.useQuery({ id: '123' });
```

## Azure Infrastructure

### Provisioning (Bicep IaC)
**File**: `infra/azure/main.bicep` + `infra/azure/parameters/prod.parameters.json`

```bash
az deployment group create \
  --resource-group <rg-name> \
  --template-file infra/azure/main.bicep \
  --parameters @infra/azure/parameters/prod.parameters.json
```

**Resources**: Cosmos DB (autoscale, 3 containers), Azure OpenAI, AI Search (vector), Blob Storage, Redis, Log Analytics, Application Insights.

### Cosmos DB Schema
**Database**: `BenefitsChat`
**Containers**: `Conversations`, `Users`, `Documents` (partition key: `/companyId`)

**Access pattern**:
```typescript
import { getContainer } from '@/lib/azure/cosmos-db';
const container = await getContainer('Users');
```

### Azure AI Search (Vector Index)
**Index**: `chunks_prod_v1`
**Fields**: `chunk_id`, `content`, `content_vector` (1536 dims, HNSW, cosine)

**Query** (in `lib/rag/hybrid-retrieval.ts`):
```typescript
const vectorResults = await searchClient.search(query, {
  vectorQueries: [{ kind: 'vector', vector: embedding, kNearestNeighborsCount: 24 }],
  filter: `company_id eq '${companyId}'`
});
```

## Testing & Quality

### Test Stack
- **Unit/Integration**: Vitest (`npm run test`)
- **Load**: k6 (`tests/load/k6-rag-scenarios.js`)
- **UAT**: Manual runbook (`tests/uat/test-matrix.yaml`)

### RAG Quality Metrics
**File**: `lib/analytics/quality-tracker.ts`

Tracks per-conversation:
- Response time, grounding score, escalation count
- Tier used, cache hit/miss, resolution status

**Usage** (in `app/api/qa/route.ts`):
```typescript
import { QualityTracker } from '@/lib/analytics/quality-tracker';

QualityTracker.recordConversation({
  conversationId, responseTime, groundingScore, tier, /* ... */
});
```

## Common Tasks

### Add a new API endpoint
1. Create `app/api/[name]/route.ts`
2. Apply auth middleware: `export const POST = requireCompanyAdmin(handler)`
3. Validate input with Zod schemas (`lib/validation/unified-schemas.ts`)
4. Use singleton services (`benefitService`, `userService`)
5. Return `NextResponse.json({ ... })`

### Add a new RAG validation rule
1. Edit `lib/rag/validation.ts`
2. Update `validateResponse()` function
3. Adjust escalation thresholds in `lib/rag/pattern-router.ts`
4. Test with `tests/load/k6-rag-scenarios.js`

### Modify Azure infrastructure
1. Edit `infra/azure/main.bicep`
2. Update `infra/azure/parameters/prod.parameters.json`
3. Run `az deployment group create ...` (see above)
4. Update env vars in Vercel dashboard

### Add a new role permission
1. Add to `PERMISSIONS` in `lib/auth/unified-auth.ts`
2. Update `ROLE_PERMISSIONS` mapping
3. Export helper: `export const requireNewPermission = withAuth(undefined, [PERMISSIONS.NEW])`

## Troubleshooting

### Build failures
- **"Cannot find module '@azure/...' at build time"**: Check for top-level imports. Use `isBuild()` guard.
- **Hydration mismatches**: Use `<NoSSR>` wrapper (`components/no-ssr.tsx`) for client-only components.

### Azure connection errors
- **Cosmos/Redis/OpenAI unavailable**: Verify env vars in Vercel dashboard. Check Azure service health.
- **"Circuit breaker open"**: Transient Azure failure. Check `lib/monitoring/advanced-alerting.ts`.

### RAG performance issues
- **Slow L3 responses (>6s)**: Check Azure OpenAI quota/throttling. Review tier routing signals.
- **Low grounding scores (<70%)**: Expand retrieval K (increase from 8 to 12 chunks). Review document chunking strategy.

## Key Reference Files

| Concern | File(s) |
|---------|---------|
| RAG orchestration | `app/api/qa/route.ts` |
| RAG modules | `lib/rag/*.ts` (8 files: cache, retrieval, routing, validation, etc.) |
| Auth system | `lib/auth/unified-auth.ts` |
| Azure clients | `lib/azure/*.ts` |
| Service layer | `lib/services/*.ts` |
| Environment config | `config/environments.ts` |
| IaC | `infra/azure/main.bicep` |
| Type definitions | `types/rag.ts`, `types/index.ts` |

## Documentation

- **Bootstrap guides**: `BOOTSTRAP_STEP*.md` (architecture decisions, Azure setup, RAG design)
- **Deployment**: `VERCEL_DEPLOYMENT_GUIDE.md`, `DEPLOYMENT_SUMMARY.md`
- **UAT**: `tests/uat/test-matrix.yaml`
- **README**: `README.md` (setup, scripts, health endpoints)
- **Cosine Similarity**: `docs/COSINE_SIMILARITY.md` (semantic search, deduplication, thresholds)
