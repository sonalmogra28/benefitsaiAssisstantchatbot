# Thread Handoff — Accuracy Consolidation

## Primary goal for the next thread

Complete **ACCURACY-CONSOLIDATION-PLAN.md** in sequence. Do not deviate from it.

### Where we are

| Phase | Status |
|---|---|
| Phase 1 — PDF audit | **Done.** All 2026 values verified against the PDF. |
| Phase 2 — Tier 1: `amerivet-plan-summaries.ts` | **Done.** Converted to thin catalog adapter. No hardcoded values. Tests pass. |
| Phase 3 — Tier 2: QA builder files | **Done.** All hardcoded dollar/pct figures replaced with catalog reads across 5 files. 927 tests pass. |
| Phase 4 — Tier 3: System prompt | **Done.** STD 60% in system prompt rule and L1 intercept now read from catalog. |
| Phase 5 — Eval dataset refresh | **Done.** TIER-001/002/005 updated to match PDF-verified catalog values. 927 tests pass. |

**All 5 phases complete.** Ready to commit and open PR.

---

## Secondary work — do NOT start until accuracy plan is complete

A separate plan file exists at `.claude/plans/we-are-building-this-glittery-sunrise.md`. It covers two workstreams that are real and valid but got surfaced prematurely this session and caused confusion:

1. **STD/LTD as catalog objects** — right now STD/LTD facts are hardcoded strings in QA builders, not catalog entries. This is a root-cause fix, not a bug fix.
2. **Dynamic company name (multi-tenant foundation)** — 60 hardcoded "AmeriVet" strings need to become `TenantConfig.name` before Client 2 onboarding.

Neither of these blocks the accuracy consolidation. Finish the accuracy plan first, then address these.

