# Data Validation Quick Reference

**Purpose:** Verify that real AmeriVet benefits data is loaded and ready for production use.

---

## 🎯 Quick Start

### Step 1: Validate Data Upload
```bash
# Option A: Use API endpoint (requires admin authentication)
curl -X GET https://amerivetaibot.bcgenrolls.com/api/admin/validate-data \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Option B: Login to admin dashboard and navigate to:
# https://amerivetaibot.bcgenrolls.com/admin/validate-data
```

**Expected Result:**
```json
{
  "success": true,
  "summary": {
    "totalRecords": 150,
    "overallStatus": "operational"
  },
  "message": "✅ Real AmeriVet data successfully loaded"
}
```

### Step 2: Validate Embeddings
```bash
npm run validate:embeddings
```

**Expected Output:**
```
📊 Validation Results:
✅ 2025 Medical Plan SPD - 18 chunks, embeddings: Yes (1536 dims)
✅ 401k Enrollment Guide - 12 chunks, embeddings: Yes (1536 dims)

📈 Summary: 25 documents, 312 chunks, all with embeddings ✅
```

### Step 3: Test Search Accuracy
1. Login: https://amerivetaibot.bcgenrolls.com/subdomain/login
2. Password: `amerivet2024!` (employee) or `admin2024!` (admin)
3. Ask test questions:
   - "What is my medical deductible?"
   - "How do I enroll in 401k?"
   - "What dental services are covered?"
4. Verify answers cite correct source documents

---

## 📊 Validation Tools

### 1. Data Validation API
**Endpoint:** `GET /api/admin/validate-data`  
**Auth:** Company Admin or higher  
**Purpose:** Check all Cosmos DB containers have data

**What it validates:**
- ✅ All 7 containers accessible
- ✅ Record counts per container
- ✅ Sample records exist
- ✅ Company filter works (amerivet)

### 2. Embedding Validation Script
**Command:** `npm run validate:embeddings`  
**Auth:** None (uses Azure service principal)  
**Purpose:** Verify embeddings generated for all documents

**What it validates:**
- ✅ Documents have chunks
- ✅ Chunks have embeddings
- ✅ Embedding dimensions correct (1536)
- ✅ No orphaned chunks

### 3. Search Accuracy Testing
**Method:** Manual UAT + Load Testing  
**Auth:** Employee or Admin password  
**Purpose:** Validate RAG pipeline with real queries

**What it validates:**
- ✅ Answers cite correct documents
- ✅ Grounding scores ≥70%
- ✅ Response times meet SLA
- ✅ Cache behavior correct

---

## 🐛 Troubleshooting

### Issue: "No documents found for AmeriVet"
**Cause:** Data not uploaded to Cosmos DB  
**Fix:**
1. Verify containers exist in Azure Portal
2. Check `companyId = 'amerivet'` in all records
3. Re-upload data from source files

### Issue: "No embeddings found"
**Cause:** Embedding generation not run  
**Fix:**
```bash
# Navigate to admin dashboard
# Click "Generate Embeddings" button
# Or use API:
curl -X POST https://amerivetaibot.bcgenrolls.com/api/admin/generate-embeddings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Issue: "Low grounding scores (<70%)"
**Cause:** Poor document chunking or insufficient data  
**Fix:**
1. Review document chunking strategy (chunk size, overlap)
2. Add more source documents to improve coverage
3. Adjust retrieval parameters (increase K from 8 to 12)

### Issue: "Slow response times (>6s)"
**Cause:** Azure OpenAI throttling or network issues  
**Fix:**
1. Check Azure OpenAI quota (Tokens Per Minute)
2. Review Application Insights for throttling events
3. Consider scaling up Azure OpenAI deployment

---

## 📋 Success Criteria

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Data Loaded** | 100% | API validation endpoint |
| **Embeddings Generated** | 100% | `npm run validate:embeddings` |
| **Search Accuracy** | 90%+ | Manual testing + load tests |
| **Response Time (L1)** | <2s | Analytics dashboard |
| **Grounding Score** | >75% | Conversation metadata |
| **Cache Hit Rate** | >40% | Redis analytics |

---

## 🚦 Status Dashboard

Check current status:
- **Data Upload:** ✅ Completed (Nov 3, 2025)
- **Embedding Generation:** 🔄 In Progress
- **Search Validation:** ⏳ Pending
- **UAT Testing:** ⏳ Pending (Week 1: Nov 4-8)

---

## 📚 Full Documentation

For comprehensive validation procedures, see:
- [DATA_VALIDATION_CHECKLIST.md](./DATA_VALIDATION_CHECKLIST.md)
- [PRODUCTION_READINESS_CHECKLIST.md](./PRODUCTION_READINESS_CHECKLIST.md)
- [UAT Test Matrix](./tests/uat/test-matrix.yaml)

---

**Last Updated:** November 3, 2025  
**Next Review:** After embedding validation completes
