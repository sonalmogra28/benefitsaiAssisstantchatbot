# Quick Reference: 3-Chunk Issue Resolution

**Status:** 🟢 FIXED - Awaiting deployment validation

---

## The Problem (Solved)

| Metric | Before | After |
|--------|--------|-------|
| Index | chunks_prod_v2 (3 docs) | chunks_prod_v1 (499 docs) |
| Retrieval | 3 chunks | 40 chunks |
| Citations | 3 | 12 |
| Grounding | 5-52% | 60%+ |
| Tier | L3 (escalated) | L1/L2 |

---

## What Changed

### Code (Commit a47f766)
- `lib/rag/hybrid-retrieval.ts`: Default index to v1 + added debug logs
- `app/api/qa/route.ts`: Enhanced metadata + improved logging

### Environment (Nov 6, 2025, 18:45 UTC)
```
BEFORE:  AZURE_SEARCH_INDEX_NAME = chunks_prod_v2 (test index)
AFTER:   AZURE_SEARCH_INDEX_NAME = chunks_prod_v1 (production index)
```

---

## Validation Checklist

### Immediate (Next 5 min)

```powershell
# 1. Test API
$body = @{query="What are the dental benefits?"; companyId="amerivet"} | ConvertTo-Json
$resp = Invoke-RestMethod https://amerivetaibot.bcgenrolls.com/api/qa -Method POST -ContentType 'application/json' -Body $body
Write-Host "Retrieval: $($resp.metadata.retrievalCount), Grounding: $($resp.metadata.groundingScore)"

# Expected: retrievalCount >= 12, groundingScore >= 0.60
```

### Short-term (Next 10 min)

```powershell
# 2. Run smoke test
powershell -File scripts/smoke-test-prod.ps1

# Expected: All 5 queries pass with retrievalCount >= 8 and grounding >= 60%
```

---

## Rollback (If Needed)

```powershell
vercel env rm AZURE_SEARCH_INDEX_NAME production --scope melodie-s-projects
vercel --prod --force --scope melodie-s-projects
```

---

**Last Updated:** November 6, 2025, 18:47 UTC
