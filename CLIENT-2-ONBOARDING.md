# Client 2 Onboarding Guide

> **Audience:** A future Claude Code session with zero context from the session that wrote this.
> **Purpose:** Step-by-step instructions to onboard the second client tenant onto this platform, plus notes that make Client 3 even cheaper to add.

---

## What's Already Multi-Tenant (No Code Changes Required)

These three things work correctly for any new Vercel deployment today:

**1. Company name in UI copy**
`lib/qa/tenant-context.ts` exports `COMPANY_NAME = process.env.COMPANY_NAME ?? 'AmeriVet'`. Every QA response builder and system prompt that references the company name pulls from this. Set the env var, the correct name appears everywhere.

**2. Azure AI Search — per-tenant document isolation**
`lib/ai/vector-search.ts` and `lib/search/search.ts` both filter search results by `company_id`. The field name defaults to `company_id` (overridable via `AZURE_SEARCH_COMPANY_FIELD`). The company ID flows from the `x-company-id` request header, which is set by `lib/auth/unified-auth.ts` after authentication. For unauthenticated/admin contexts the fallback is `DEFAULT_COMPANY_ID` from `lib/config.ts` (`process.env.DEFAULT_COMPANY_ID ?? "amerivet"`). **Bottom line:** set `DEFAULT_COMPANY_ID` to the new tenant's slug and search isolation is automatic — provided you upload that tenant's documents with matching `company_id` metadata (see Step 7 below).

**3. Separate Vercel deployment**
Each tenant gets its own Vercel project. Different URL, different env vars, zero shared state. The same Git repo can back all deployments.

---

## The Catalog Data Gap (Requires Code Work Per Tenant)

This is the one thing that is **not** multi-tenant today.

`lib/data/amerivet-package.ts` exports `getAmerivetBenefitsPackage()`. This function returns a hardcoded `AmerivetBenefitsPackage` object built from AmeriVet's catalog (`lib/data/amerivet.ts`). It is called in **22 files**:

```
app/api/chat/route.ts           (lines 23, 45–47, 137, 151–152, 355, 625)
app/api/qa/route.ts             (lines 36, 120–121, 158, 741, 847, 3072, 3084, 3225–3226)
lib/ai/prompts.ts               (lines 5, 24, 38, 82)
lib/ai/tools/benefits-comparison.ts (lines 13, 48)
lib/data/amerivet-benefits.ts   (lines 3, 20)
lib/data/amerivet-package-copy.ts  (lines 3, 42)
lib/data/amerivet-package.ts    (internal default parameter — 13 call sites)
lib/qa-v2/deterministic-intents.ts (lines 31, 279)
lib/qa-v2/engine.ts             (lines 1, 18–19, 22, 83–90)
lib/qa-v2/llm-passthrough.ts    (lines 27, 273)
lib/qa-v2/post-gen-validator.ts (lines 20, 29, 150, 154–155)
lib/qa/category-response-builders.ts (lines 5, 117, 404)
lib/qa/medical-helpers.ts       (lines 5, 183, 207, 225, 248, 289, 313, 437)
lib/qa/medical-response-builders.ts (lines 3, 91)
lib/qa/non-medical-detail-lookup.ts (lines 2, 12, 21)
lib/qa/plan-detail-lookup.ts    (lines 13, 48, 128, 618)
lib/qa/routine-benefit-detail-lookup.ts (lines 1, 53)
lib/qa/routing-helpers.ts       (lines 2, 10)
lib/rag/pricing-utils.ts        (lines 8, 67)
lib/rag/response-verifier.ts    (lines 23, 80, 150, 225, 261)
lib/services/benefits.service.ts (lines 7, 64)
lib/services/simple-chat-router.ts (lines 10, 48)
```

For a Client 2 deployment, every one of these call sites needs to return Client 2's catalog instead of AmeriVet's.

**Short-term approach (per-deployment import swap):** Create Client 2's catalog and package files, then in the Client 2 Vercel deployment swap the import source. One catalog file per deployment. Simple, auditable, no runtime branching.

**Long-term approach (build during Client 2 onboarding):** Add a `lib/data/tenant-package-router.ts` that maps `tenantId → package function`, update all 22 call sites to call the router instead of `getAmerivetBenefitsPackage()` directly. Client 3 then needs zero changes to QA imports. **Build this during step 4 below — it costs ~1 hour of refactor and saves that time on every future tenant.**

---

## Step-by-Step: Onboarding Client 2

### Step 1 — Get plan documents from the client

Collect:
- Summary Plan Descriptions (SPD) or Benefits Guide PDF
- Premium rate sheets (employee cost by tier: Employee Only / +Spouse / +Child / Family)
- Carrier names and plan IDs
- Open enrollment dates
- Eligibility rules (full-time hours threshold, waiting period, dependent age cutoff)
- HSA employer contribution amounts (if any)
- Enrollment portal URL
- HR phone number

### Step 2 — Build `lib/data/client2.ts`

Model it exactly after `lib/data/amerivet.ts`. Key points:
- Use the same `BenefitPlan`, `BenefitPremiumBreakdown`, `AmerivetBenefitsCatalog` types (they live in `lib/data/amerivet.ts`; the type names are generic enough to reuse — do not rename them for Client 2, just import from the same source)
- Give each plan a stable `id` string using Client 2's slug, e.g. `"client2-medical-standard-hsa-2025"`
- If Client 2 has no regional HMO equivalent to Kaiser, set `regionalAvailability: ['nationwide']` on all medical plans and remove the Kaiser-specific constants
- Export a named const analogous to `amerivetBenefits2024_2025`

### Step 3 — Build `lib/data/client2-package.ts`

Model it after `lib/data/amerivet-package.ts`. Key points:
- Import from `./client2` instead of `./amerivet`
- The `AmerivetBenefitsPackage` interface has `employerKey: 'amerivet'` hardcoded. For Client 2, either:
  - Change `employerKey` to `string` in the interface (preferred — one-line change in `amerivet-package.ts` line 16)
  - Or use `'amerivet'` as a literal and accept the type mismatch (not recommended)
- Export `getClient2BenefitsPackage()` — same signature as `getAmerivetBenefitsPackage()`
- Also export the catalog-for-prompt builder. The `getAmerivetCatalogForPrompt()` function in `amerivet-package.ts` is the one that generates the immutable lookup table injected into every system prompt. **Update the carrier lock section** (lines 229–237 of `amerivet-package.ts`) to reflect Client 2's actual carriers. The RIGHTWAY/Kaiser notes are AmeriVet-specific — do not carry them over blindly.

### Step 4 — Update all 22 import call sites

**If building the tenant router (recommended):**

Create `lib/data/tenant-package-router.ts`:
```typescript
import { getAmerivetBenefitsPackage, type AmerivetBenefitsPackage } from './amerivet-package';
import { getClient2BenefitsPackage } from './client2-package';

const TENANT_MAP: Record<string, () => AmerivetBenefitsPackage> = {
  amerivet: getAmerivetBenefitsPackage,
  client2:  getClient2BenefitsPackage,
};

export function getTenantPackage(tenantId?: string | null): AmerivetBenefitsPackage {
  const id = tenantId ?? process.env.DEFAULT_COMPANY_ID ?? 'amerivet';
  return (TENANT_MAP[id] ?? TENANT_MAP['amerivet'])();
}
```

Then in each of the 22 files: replace `import { getAmerivetBenefitsPackage } from '@/lib/data/amerivet-package'` with `import { getTenantPackage as getAmerivetBenefitsPackage } from '@/lib/data/tenant-package-router'`. The rename alias means all internal call sites stay unchanged — this is a search-and-replace on the import line only.

**If doing the simple per-deployment swap instead:**
Replace the `lib/data/amerivet-package.ts` import with `lib/data/client2-package.ts` in all 22 files in the Client 2 deployment branch only. Do not merge this back to main.

### Step 5 — Create a new Vercel project for Client 2

- In the Vercel dashboard, create a new project pointing at the same Git repo
- Link it to a production branch or use environment-specific overrides
- Set all required env vars (see "Env Vars" section below)
- The deployment URL will be the tenant's subdomain

### Step 6 — Set `DEFAULT_COMPANY_ID`

In the Client 2 Vercel project env vars, set:
```
DEFAULT_COMPANY_ID=client2
```

This value must exactly match:
- The `company_id` metadata on documents uploaded to Azure Blob Storage (Step 7)
- The key used in `TENANT_MAP` in `tenant-package-router.ts` (Step 4)

### Step 7 — Upload plan documents and re-index

1. Upload Client 2's plan PDFs to Azure Blob Storage with metadata `company_id: client2`
2. Trigger a re-index in Azure AI Search
3. Confirm documents appear in the index filtered by `company_id eq 'client2'`

The existing indexing pipeline reads `company_id` from blob metadata and stores it as a field in the search index. No pipeline changes needed — just correct metadata on upload.

### Step 8 — Run evals against the new tenant

The eval suite lives in `tests/eval/`. Before running:
- Set `DEFAULT_COMPANY_ID=client2` in your local `.env.test`
- Verify the eval dataset covers Client 2's actual plan names and carriers (the existing dataset is AmeriVet-specific; you'll need a Client 2 variant)
- Pass rate target: 100% on Tier 1 deterministic assertions before shipping

### Step 9 — Smoke test

Adapt the QA script to use Client 2 plan names. Key scenarios to cover:
- Medical plan comparison (Client 2's actual plan names)
- Dental and vision summary
- Voluntary/life benefit description
- Escalation path (HR phone number from `HR_PHONE_NUMBER` env var)
- Regional availability (if Client 2 has region-specific plans)
- Out-of-scope benefit question (should decline gracefully)

---

## Making Client 3 Easier

If you built `lib/data/tenant-package-router.ts` during Client 2 onboarding, Client 3 only needs:

- Steps 1–3 (catalog + package files)
- Add one line to `TENANT_MAP` in `tenant-package-router.ts`
- Steps 5–9 (Vercel project, env vars, document upload, evals, smoke test)

Steps 4 (import surgery across 22 files) is already done and never needs to happen again.

---

## Env Vars Required Per Deployment

Set all of these in the Vercel project environment (Production + Preview):

| Var | Purpose | Notes |
|-----|---------|-------|
| `COMPANY_NAME` | Display name in all UI copy | e.g. `"Acme Veterinary Group"` |
| `DEFAULT_COMPANY_ID` | Tenant slug for search filtering + package router | e.g. `"client2"` — must match blob metadata |
| `ENROLLMENT_PORTAL_URL` | Link shown to employees for enrollment | Tenant-specific |
| `HR_PHONE_NUMBER` | HR contact shown in escalation responses | Tenant-specific |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI resource URL | Can be shared across tenants |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | Can be shared across tenants |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Chat completion deployment name | e.g. `gpt-4o` |
| `AZURE_SEARCH_ENDPOINT` | Azure AI Search endpoint | Can be shared; isolation via `company_id` filter |
| `AZURE_SEARCH_API_KEY` | Azure AI Search query key | Can be shared |
| `AZURE_SEARCH_INDEX` | Index name | Can be shared; filtering handles isolation |
| `AZURE_COSMOS_ENDPOINT` | Cosmos DB endpoint | Can be shared |
| `AZURE_COSMOS_KEY` | Cosmos DB key | Can be shared |
| `NEXTAUTH_SECRET` | Session signing secret | Generate a fresh one per deployment |
| `NEXTAUTH_URL` | Canonical deployment URL | Must match the Vercel deployment URL |
| `SUPER_ADMIN_PASSWORD` | Access to `/subdomain/platform` | **Melodie only — never share with client** |

Optional but commonly needed:
- `AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT` — embedding model deployment name
- `AZURE_STORAGE_CONNECTION_STRING` — if direct blob access is needed
- `APPLICATIONINSIGHTS_CONNECTION_STRING` — for Azure Monitor telemetry
- `RATE_LIMIT_REQUESTS_PER_MINUTE` — tune per tenant if needed

---

## Quick Reference: Key Files

| File | What it does |
|------|-------------|
| `lib/data/amerivet.ts` | AmeriVet's catalog — types + data. **Model Client 2's catalog after this.** |
| `lib/data/amerivet-package.ts` | Package builder + all catalog utility functions. `getAmerivetBenefitsPackage()` is the root of the multi-tenant gap. |
| `lib/data/tenant-package-router.ts` | **Does not exist yet.** Create this during Client 2 onboarding to make Client 3 cheap. |
| `lib/qa/tenant-context.ts` | `COMPANY_NAME` env var — already multi-tenant, no changes needed. |
| `lib/config.ts` | `DEFAULT_COMPANY_ID` — controls which company's documents are searched. |
| `lib/ai/vector-search.ts` | Applies `company_id` filter to every Azure Search query. |
| `lib/deployment/index.ts` | `TenantConfig` + `DeploymentConfig` interfaces. Not yet wired to the package router. |
| `tests/eval/` | Eval suite — need a Client 2 dataset variant before running evals. |
