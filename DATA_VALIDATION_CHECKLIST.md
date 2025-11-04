# Data Validation Checklist - AmeriVet Benefits AI

**Last Updated:** November 3, 2025  
**Status:** Real AmeriVet Data Loaded ✅  
**Next Steps:** Embedding Validation & Search Accuracy Testing

---

## 📋 Validation Overview

This checklist ensures that all real AmeriVet benefits data has been successfully uploaded, processed, and is ready for production use.

### Validation Phases
1. ✅ **Data Upload** - Manual upload to Cosmos DB containers
2. 🔄 **Embedding Generation** - Automated chunk processing and vector generation
3. ⏳ **Search Accuracy** - RAG pipeline validation with real queries
4. ⏳ **End-to-End Testing** - Full UAT with employee and admin workflows

---

## 1️⃣ Data Upload Validation (✅ COMPLETED - Nov 3, 2025)

### Cosmos DB Containers

| Container | Status | Record Count | Sample Check |
|-----------|--------|--------------|--------------|
| **Companies** | ✅ | TBD | AmeriVet company record exists |
| **Users** | ✅ | TBD | Test employee/admin accounts created |
| **Benefits** | ✅ | TBD | Medical, dental, vision, 401k plans loaded |
| **Documents** | ✅ | TBD | SPDs, enrollment guides, FAQs uploaded |
| **FAQs** | ✅ | TBD | Common questions and answers loaded |
| **DocumentChunks** | 🔄 | TBD | Pending embedding generation |
| **Conversations** | ⏳ | 0 | Will populate with usage |

### Validation Commands

```bash
# Option 1: API Endpoint (Requires Admin Auth)
# Navigate to: https://amerivetaibot.bcgenrolls.com/api/admin/validate-data
# Or use curl:
curl -X GET https://amerivetaibot.bcgenrolls.com/api/admin/validate-data \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Option 2: Local Development Script
npm run validate:embeddings
```

### Expected Output

```json
{
  "success": true,
  "summary": {
    "timestamp": "2025-11-03T...",
    "totalContainers": 7,
    "successCount": 6,
    "warningCount": 1,
    "errorCount": 0,
    "totalRecords": 150,
    "overallStatus": "warnings"
  },
  "results": [
    {
      "container": "Documents",
      "status": "success",
      "count": 25,
      "sampleId": "doc-001"
    }
  ]
}
```

---

## 2️⃣ Embedding Generation Validation (🔄 IN PROGRESS)

### What Are Embeddings?

Embeddings are 1536-dimensional vector representations of text chunks that enable semantic search. Each uploaded document is:
1. **Chunked** into ~500-token segments (with 50-token overlap)
2. **Vectorized** using Azure OpenAI `text-embedding-ada-002`
3. **Stored** in Cosmos DB `DocumentChunks` container
4. **Indexed** in Azure AI Search for hybrid retrieval

### Validation Script

```bash
npm run validate:embeddings
```

### Expected Console Output

```
🔍 Starting embedding validation...

📄 Found 25 AmeriVet documents

🧩 Found 312 total document chunks

📊 Validation Results:
────────────────────────────────────────────────────────────────────────────────
✅ 2025 Medical Plan SPD
   Document ID: doc-medical-2025
   Chunks: 18
   Embeddings: Yes
   Dimensions: 1536

✅ 401k Enrollment Guide
   Document ID: doc-401k-guide
   Chunks: 12
   Embeddings: Yes
   Dimensions: 1536

⚠️ Dental Coverage FAQ
   Document ID: doc-dental-faq
   Chunks: 0
   Issues: No chunks generated

────────────────────────────────────────────────────────────────────────────────

📈 Summary:
   Total Documents: 25
   ✅ Success: 24
   ⚠️ Warnings: 1
   Total Chunks: 312
   Chunks with Embeddings: 312

✅ All documents have embeddings generated!
```

### Success Criteria

- ✅ All documents have at least 1 chunk
- ✅ All chunks have embeddings (1536 dimensions)
- ✅ Total chunks: ~10-15 per document (depends on document length)
- ✅ No TypeScript/query errors during validation

### Troubleshooting

If embeddings are missing:

1. **Check Azure OpenAI Quota**
   ```bash
   # Azure Portal > OpenAI Service > Quotas & Limits
   # Verify "text-embedding-ada-002" has sufficient TPM
   ```

2. **Re-run Embedding Generation**
   ```bash
   # Option 1: Via Admin Dashboard
   # Navigate to: /admin/documents
   # Click "Regenerate Embeddings" button

   # Option 2: Via API
   curl -X POST https://amerivetaibot.bcgenrolls.com/api/admin/generate-embeddings \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"documentIds": ["doc-id-1", "doc-id-2"]}'
   ```

3. **Check Logs**
   ```bash
   # Vercel Dashboard > Logs
   # Filter by: "embedding" OR "chunk"
   # Look for errors from Azure OpenAI service
   ```

---

## 3️⃣ Search Accuracy Validation (⏳ PENDING)

### Test Query Matrix

Test the RAG pipeline with real AmeriVet employee questions:

| Query | Expected Result | L1/L2/L3 | Cache |
|-------|----------------|----------|-------|
| "What is my medical deductible?" | Medical plan deductible amount from SPD | L1 | MISS |
| "How do I enroll in 401k?" | Step-by-step enrollment guide | L1 | MISS |
| "What dental services are covered?" | Dental coverage list from benefits doc | L1 | MISS |
| "Can I add my spouse mid-year?" | Qualifying life event rules | L2 | MISS |
| "What happens if I miss open enrollment?" | Late enrollment penalty/process | L2 | MISS |
| (Repeat query #1) | Same answer | L0 | HIT |

### Manual Testing Steps

1. **Login as Employee**
   - URL: https://amerivetaibot.bcgenrolls.com/subdomain/login
   - Password: `amerivet2024!`

2. **Ask Test Questions**
   - Use queries from matrix above
   - Verify answers reference correct documents
   - Check citation links work

3. **Verify Metadata**
   - Check response includes:
     - ✅ Source document citations
     - ✅ Grounding score ≥70%
     - ✅ Tier used (L1/L2/L3)
     - ✅ Response time <2s (L1), <3s (L2), <6s (L3)

4. **Test Cache Behavior**
   - Ask same question twice
   - Second response should be <5ms (L0 cache hit)

### Automated Testing

```bash
# Run RAG load test scenarios
npm run load:test

# Expected output:
# - Avg response time: <2s
# - Cache hit rate: >40% (after warmup)
# - Grounding scores: >70%
# - Zero 500 errors
```

### Success Criteria

- ✅ 90%+ of answers correctly cite source documents
- ✅ Grounding scores average >75%
- ✅ Response times within SLA targets
- ✅ Cache hit rate >40% after 100 queries
- ✅ No PII leakage in responses
- ✅ All citations link to valid documents

---

## 4️⃣ End-to-End UAT Testing (⏳ PENDING)

### Test Scenarios

Refer to `tests/uat/test-matrix.yaml` for complete UAT matrix.

**Key Workflows to Validate:**

1. **Employee Onboarding**
   - ✅ Login with employee password
   - ✅ Ask 3 common benefits questions
   - ✅ Download document from citation link
   - ✅ View conversation history

2. **Admin Dashboard**
   - ✅ Login with admin password
   - ✅ View analytics dashboard
   - ✅ Upload new benefits document
   - ✅ Trigger embedding generation
   - ✅ View all user conversations

3. **Benefits Comparison**
   - ✅ Compare medical plans side-by-side
   - ✅ Calculate cost estimates
   - ✅ Export comparison to PDF

4. **Edge Cases**
   - ✅ Ask off-topic question (should politely redirect)
   - ✅ Ask question with no answer in docs (should escalate)
   - ✅ Test with very long question (500+ chars)
   - ✅ Test with special characters/emojis

### UAT Participants

- [ ] **Internal QA** (Week 1: Nov 4-8)
  - Sonal (Developer)
  - 2 Beta Testers

- [ ] **Client Pilot** (Week 3: Nov 18-22)
  - Brandon (AmeriVet Client Contact)
  - 5 AmeriVet Employees

### UAT Checklist

- [ ] All login flows work (employee + admin)
- [ ] RAG pipeline returns accurate answers
- [ ] Documents upload and process successfully
- [ ] Analytics dashboard displays correct metrics
- [ ] Cost calculator produces accurate estimates
- [ ] Mobile responsiveness verified (iOS + Android)
- [ ] Browser compatibility tested (Chrome, Safari, Edge, Firefox)
- [ ] Performance meets targets (LCP <2.5s, FID <100ms, CLS <0.1)

---

## 5️⃣ Data Quality Metrics

### Document Coverage Analysis

```sql
-- Cosmos DB Query: Check coverage by benefit type
SELECT 
  c.benefitType,
  COUNT(1) as documentCount
FROM c
WHERE c.companyId = 'amerivet'
  AND c.type = 'document'
GROUP BY c.benefitType
```

**Expected Coverage:**

| Benefit Type | Min Documents | Actual | Status |
|--------------|---------------|--------|--------|
| Medical      | 5             | TBD    | ⏳     |
| Dental       | 3             | TBD    | ⏳     |
| Vision       | 2             | TBD    | ⏳     |
| 401k         | 4             | TBD    | ⏳     |
| Life Insurance | 2          | TBD    | ⏳     |
| General FAQs | 10            | TBD    | ⏳     |

### Embedding Quality Checks

- **Average Chunk Size:** 400-600 tokens ✅
- **Overlap Size:** 50 tokens ✅
- **Embedding Dimensions:** 1536 (Azure OpenAI `ada-002`) ✅
- **Embedding Generation Rate:** ~50 chunks/minute ⏳
- **Failed Chunks:** <1% ✅

### Search Relevance Metrics

Track these in production (after go-live):

- **Average Grounding Score:** Target >75%
- **L1 Accuracy:** Target >80% (correct tier selection)
- **Cache Hit Rate:** Target >40% (after 24h)
- **User Satisfaction:** Target >4.0/5.0 stars

---

## 🚀 Deployment Readiness Gate

### Pre-Launch Checklist

- [ ] **Data Validation:** All containers have real AmeriVet data
- [ ] **Embedding Validation:** All documents have embeddings (1536-dim)
- [ ] **Search Accuracy:** 90%+ correct answers in test matrix
- [ ] **UAT Completed:** No critical bugs, <5 minor bugs
- [ ] **Performance Validated:** Meets Core Web Vitals targets
- [ ] **Security Audit:** HTTPS, CORS, rate limiting, PII redaction verified
- [ ] **Monitoring Configured:** Application Insights, Redis alerts, Cosmos DB alerts
- [ ] **Documentation Complete:** User guides, admin guides, FAQ
- [ ] **Training Videos:** Employee onboarding (5 min), Admin tour (10 min)
- [ ] **Client Sign-Off:** Brandon approves for Phase 3 launch

### Go-Live Date

**Target:** December 1, 2025  
**Client Access (Brandon):** November 20, 2025 (pilot)

---

## 📞 Support Contacts

- **Developer:** Sonal (sonal@example.com)
- **Client Contact:** Brandon (AmeriVet)
- **Azure Support:** Azure Portal > Support Ticket
- **Vercel Support:** Vercel Dashboard > Help

---

## 📚 Related Documentation

- [Production Readiness Checklist](./PRODUCTION_READINESS_CHECKLIST.md)
- [Deployment Summary](./DEPLOYMENT_SUMMARY.md)
- [UAT Test Matrix](./tests/uat/test-matrix.yaml)
- [RAG Architecture](./BOOTSTRAP_STEP4_RAG_ARCHITECTURE.md)
- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT_GUIDE.md)

---

**Document Version:** 1.0  
**Effective Date:** November 3, 2025  
**Next Review:** November 10, 2025 (post-embedding validation)
