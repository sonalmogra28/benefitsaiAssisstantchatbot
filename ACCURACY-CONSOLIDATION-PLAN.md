# Plan: Data Accuracy Audit + Hardcoded Value Consolidation

## The Problem

The codebase currently has **three layers that all store plan facts**, and they are not connected to each other. Changing a number in one layer does not change it in the others. This caused the Enhanced HSA data errors that slipped through to Brandon.

| Layer | File | Status |
|---|---|---|
| Catalog (structured data) | `lib/data/amerivet.ts` | Source of truth — but not yet verified against 2026 PDF |
| Plan summaries (prose strings) | `lib/data/amerivet-plan-summaries.ts` | Duplicates catalog, drifts silently |
| QA response builders (inline strings) | `lib/qa/*.ts` (8 files) | Scattered hardcoded facts inside logic |

The **goal of this plan** is to make the catalog the single source of truth for every factual claim the bot makes, and to verify every catalog value against the 2026 AmeriVet Benefits Guide PDF before any code changes happen.

---

## Guiding Principle: Verify Before Consolidating

Consolidating wrong values into one place makes wrong values more efficient, not more accurate. The PDF audit comes first. Code changes do not start until the catalog is verified clean.

---

## Phase 1 — PDF Audit (no code changes)

**Goal:** Produce a verified-or-flagged state for every factual value in the catalog and plan-summaries.

**Source document:** `AmeriVet_2026 Benefits Guide_v2.1_10-9-25 Kaiser rates updated.pdf`

**What we audit:**

### Medical Plans

| Field | Standard HSA | Enhanced HSA | BCBSTX PPO | Kaiser Standard HMO |
|---|---|---|---|---|
| Individual deductible | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF |
| Family deductible | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF |
| Family deductible type (embedded vs. aggregate) | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF |
| Individual OOP max | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF |
| Family OOP max | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF |
| In-network coinsurance | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF |
| Out-of-network coinsurance | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF |
| HSA-eligible (Y/N) | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF |
| Copays (PCP / specialist / urgent / ER) | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF |
| Employee-only monthly premium | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF |
| Employee+spouse monthly premium | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF |
| Employee+children monthly premium | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF |
| Family monthly premium | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF |
| Available states / regional restrictions | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF | catalog vs. PDF |

### HSA Employer Contributions

| Tier | Catalog value | PDF value | Match? |
|---|---|---|---|
| Standard HSA — Individual | $750 | ? | ? |
| Standard HSA — Family | $1,250 | ? | ? |
| Enhanced HSA — Individual | $500 | ? | ? |
| Enhanced HSA — Family | $1,000 | ? | ? |

### Dental Plan (BCBSTX Dental PPO)

| Field | Catalog value | PDF value | Match? |
|---|---|---|---|
| Individual deductible | $50 | ? | ? |
| Family deductible | $150 | ? | ? |
| Annual maximum benefit | $1,500 | ? | ? |
| Preventive coverage | 100% | ? | ? |
| Basic services coinsurance | 20% | ? | ? |
| Major services coinsurance | 50% | ? | ? |
| Orthodontia coverage | 50% / $1,000 lifetime | ? | ? |
| Ortho age limit | children up to 19 | ? | ? |
| BlueMaximum Advantage | $200/yr, up to $600 over 3 yrs | ? | ? |
| Employee-only monthly premium | varies | ? | ? |

### Vision Plan (BCBSTX / EyeMed)

| Field | Catalog value | PDF value | Match? |
|---|---|---|---|
| Exam copay | $10 | ? | ? |
| Lenses copay | $25 | ? | ? |
| Frame allowance | $130 | ? | ? |
| Contact lens allowance | $130 | ? | ? |
| Employee-only monthly premium | $5.24 | ? | ? |

### Short-Term Disability (Unum STD)

| Field | Catalog value | PDF value | Match? |
|---|---|---|---|
| Employer or employee paid | employee-paid (voluntary) | ? | ? |
| Benefit percentage | 60% | ? | ? |
| Weekly maximum benefit | $2,000/week | ? | ? |
| Elimination period (begins day) | Day 15 | ? | ? |
| Maximum benefit duration | 26 weeks | ? | ? |

### Long-Term Disability (Unum LTD)

| Field | Catalog value | PDF value | Match? |
|---|---|---|---|
| Employer or employee paid | employee-paid (voluntary) | ? | ? |
| Benefit percentage | 60% | ? | ? |
| Monthly maximum benefit | $5,000/month | ? | ? |
| Elimination period | 180 days | ? | ? |
| Benefit duration | to age 65 | ? | ? |

### Voluntary Term Life (Unum)

| Field | Catalog value | PDF value | Match? |
|---|---|---|---|
| Guaranteed Issue amount (employee) | $200,000 | ? | ? |
| Maximum coverage (employee) | $500,000 | ? | ? |
| Increment size (employee) | $10,000 | ? | ? |
| Guaranteed Issue (spouse) | $25,000 | ? | ? |
| Maximum coverage (spouse) | $250,000 | ? | ? |
| GI available at | initial enrollment only | ? | ? |
| Child coverage maximum | $10,000 | ? | ? |

### Open Enrollment

| Field | Catalog value | PDF value | Match? |
|---|---|---|---|
| Year | 2026-2027 | ? | ? |
| Start date | 2026-10-10 | ? | ? |
| End date | 2026-10-25 | ? | ? |
| Effective date | 2026-11-01 | ? | ? |

**Output of Phase 1:** A completed version of the tables above with every `?` filled in and every discrepancy flagged. No code changes happen until this is done.

---

## Phase 2 — Tier 1 Consolidation: `amerivet-plan-summaries.ts`

**Goal:** Eliminate the parallel prose-string file. Make it a thin adapter that reads values from the catalog instead of hardcoding them.

**What this file currently does:** Returns hardcoded prose strings for Standard HSA, Enhanced HSA, and Kaiser for use in the `buildMedicalPlanDetailAnswer` function.

**What it will do after:** Same function, same output format — but values are pulled from `lib/data/amerivet.ts` at call time.

**Specific fields to convert from hardcoded to catalog-sourced:**
- `deductible` → `plan.coverage.deductibles.individual` / `plan.coverage.deductibles.family`
- `outOfPocketMax` → `plan.benefits.outOfPocketMax` (and family if present)
- `inNetworkCoinsurance` → `plan.benefits.coinsurance` formatted as percentage
- `outOfNetworkCoinsurance` → `plan.coverage.coinsurance.outOfNetwork`
- `primaryCare`, `specialist`, `urgentCare`, `emergencyRoom` → from `plan.coverage.copays` (with HDHP fallback to coinsurance text when no copays exist)
- `network` → from `plan.regionalAvailability`
- `notes` → from `plan.features` (first 2-3 most important)

**Files changed:** `lib/data/amerivet-plan-summaries.ts` only.

**Tests to run after:** `npx vitest run tests/unit/plan-detail-lookup.test.ts` — this is the direct test for the function that reads plan-summaries.

**Risk:** Low. This file has one consumer (`buildMedicalPlanDetailAnswer`). The output format stays identical.

---

## Phase 3 — Tier 2 Consolidation: QA Response Builders

**Goal:** Replace hardcoded dollar figures and plan facts in the QA layer with catalog reads. This is the larger, higher-risk phase.

**Files and their specific hardcoded facts:**

### `lib/qa/non-medical-detail-lookup.ts`
- STD: 60%, $2,000/week max, day 15, 26 weeks — should read from `voluntaryPlans.find(p => p.id === 'unum-std').features`
- LTD: 60%, $5,000/month, 180 days, to age 65 — should read from `voluntaryPlans.find(p => p.id === 'unum-ltd').features`
- Life GI amount: $200,000 — should read from `voluntaryPlans.find(p => p.id === 'unum-voluntary-life').features`
- Dental orthodontia: 50% / $1,000 — should read from `dentalPlan.features`

### `lib/qa/policy-response-builders.ts`
- Parental leave STD duration: 26 weeks — should read from unum-std catalog entry
- Life insurance GI: $200,000 — catalog

### `lib/qa/category-response-builders.ts`
- Dental deductible, OOP max, ortho figures — catalog reads
- Vision copay/allowance figures — catalog reads

### `lib/qa/routine-benefit-detail-lookup.ts`
- Dental/vision specific detail strings — catalog reads

### `lib/qa/medical-helpers.ts`
- PPO clarification text — catalog (plan name, coinsurance %)

**Approach for each file:**
1. Accept the current benefits package as a parameter (already threaded through most of these functions)
2. Replace each hardcoded number with a catalog lookup
3. Keep the prose structure — only the values change, not the sentences

**Tests to run after each file:** Full test suite `npx vitest run --reporter=verbose`. Do not move to the next file until tests pass.

**Risk:** Medium. These functions have logic around the values (conditionals, formatting). Each file is independent — changes to one don't affect others, so we can do them one at a time and stop if something breaks.

---

## Phase 4 — Tier 3: System Prompt

**Goal:** Verify the system prompt in `app/api/chat/route.ts` doesn't embed specific plan facts that could drift.

**What to check:**
- Plan names referenced in the prompt (Standard HSA, Enhanced HSA, Kaiser) — these are plan names, not facts, so hardcoding is acceptable
- Any dollar figures in the prompt — these should come from catalog or be removed
- Kaiser state list — should reference `KAISER_ELIGIBLE_STATES` (already done)
- Company name — already dynamic via `COMPANY_NAME` env var

**Risk:** Low. The system prompt is mostly rules and persona, not facts.

---

## Phase 5 — Eval Dataset Refresh

**Goal:** After the catalog is verified and consolidated, update `tests/eval/eval-dataset.jsonl` so every `must_contain` dollar figure matches the now-correct catalog values.

**What to check:**
- CITATION-001 (Enhanced HSA deductible) — just updated to $2,000
- Any other eval cases that assert specific dollar amounts
- Confirm these assertions match the PDF-verified catalog values

**Risk:** Low. The eval dataset is test assertions, not user-facing content. Getting these right makes CI a reliable safety net going forward.

---

## What We Are NOT Doing

- **Carrier names** (BCBSTX, Unum, VSP, Kaiser, Allstate) — these come from the catalog's `provider` field. They don't need to be dynamic.
- **Open enrollment portal URL and HR phone** — these are already constants pulled from env vars.
- **Multi-tenant company name** — already dynamic via `COMPANY_NAME`. Deeper multi-tenant work is deferred to Client 2 onboarding.
- **Prescription drug tier details** — not in the PDF at this level. Keep the honest "I don't have that detail" fallback.
- **Monthly premiums** — all tiers verified against the 2026 Benefits Guide PDF (pages 7–8, 16–17). Catalog values confirmed correct. No changes needed.

---

## Definition of Done

The work is complete when:

1. Every cell in the Phase 1 audit table has a confirmed value
2. `amerivet-plan-summaries.ts` reads from the catalog — no hardcoded dollar amounts
3. The 8 QA builder files have no hardcoded dollar figures that diverge from the catalog
4. `npx vitest run --reporter=verbose` passes on all tests except the 2 pre-existing chat route mock failures
5. The bot's response to "what is the Enhanced HSA deductible" and "what is the specialist cost on the enhanced plan" and "how long does STD last" all produce answers that match the PDF exactly

---

## Sequence

```
Phase 1 (PDF audit)         — prerequisite for everything, no code
Phase 2 (plan-summaries)    — one file, lowest risk, do first
Phase 3 (QA builders)       — one file at a time, test after each
Phase 4 (system prompt)     — quick check, mostly already clean
Phase 5 (eval dataset)      — cleanup pass, confirms CI is reliable
```

We do not start Phase 2 until Phase 1 is complete and every discrepancy is fixed in the catalog.
