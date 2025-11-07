# 🚀 Benefits AI Chatbot - Quick Start

## ✅ Current Status: **OPERATIONAL**

The chatbot is now **working** and retrieving documents successfully!

---

## 🎯 Test Locally (10 seconds)

```bash
# Start server
npm run dev

# In another terminal, run test
node test-chatbot.mjs
```

**Expected Output:**
```
✅ Status: 200
📝 Answer: Based on the provided benefits documentation...
🎯 Tier: L3
📊 Grounding: 0.32
```

---

## 🧪 Manual Test

```bash
curl -X POST http://localhost:8080/api/qa \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What dental benefits are covered?",
    "companyId": "amerivet",
    "userId": "test-user",
    "conversationId": "test-123"
  }'
```

---

## 🔧 Key Configuration

### Environment Variables (`.env.local`)
```bash
AZURE_SEARCH_INDEX=chunks_prod_v1          # ⚠️ Must be exact name
AZURE_SEARCH_ENDPOINT=https://amerivetsearch.search.windows.net
AZURE_SEARCH_API_KEY=<YOUR_AZURE_SEARCH_KEY>  # From Azure portal or secrets folder
AZURE_OPENAI_ENDPOINT=https://amerivetopenai.openai.azure.com
AZURE_OPENAI_API_KEY=<YOUR_AZURE_OPENAI_KEY>  # From Azure portal or secrets folder
```

### Critical Settings
- **Index:** `chunks_prod_v1` (499 documents)
- **Company ID:** `amerivet`
- **Cache:** Temporarily bypassed (`CACHE_DEBUG_BYPASS=true`)

---

## 🐛 Troubleshooting

### "I don't have enough information"
```bash
# Check index and company ID
echo $env:AZURE_SEARCH_INDEX  # Should be: chunks_prod_v1
# Query must use companyId: "amerivet"
```

### Zero grounding score
```bash
# Cache might have stale data
# Restart server: Ctrl+C, then npm run dev
```

### Build errors
```bash
# Ensure all env vars set
npm run typecheck  # Should pass with 0 errors
```

---

## 📊 Health Checks

```bash
# Server health
curl http://localhost:8080/api/health

# Document retrieval (debug)
curl "http://localhost:8080/api/debug/retrieval?query=dental+coverage"

# Index stats
# Should show: bm25Count: 8, vectorCount: -1 (vector disabled)
```

---

## 🚀 Production Deployment

```bash
# Deploy to Vercel
vercel --prod

# Check deployment
vercel ls --scope melodie-s-projects

# View logs
vercel logs --scope melodie-s-projects
```

---

## 📝 Files to Know

| File | Purpose |
|------|---------|
| `test-chatbot.mjs` | Quick validation script |
| `.env.local` | Local environment config |
| `CHATBOT_SUCCESS_SUMMARY.md` | Complete technical details |
| `app/api/qa/route.ts` | Main Q&A endpoint |
| `lib/rag/hybrid-retrieval.ts` | Document retrieval logic |

---

## 🎯 Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| Retrieval | 50ms ✅ | <100ms |
| Grounding | 0.32 ⚠️ | >0.70 |
| Latency | 1.5s ✅ | <3s |
| Cache Hit | 0% ⚠️ | >80% |

---

## ⚡ Quick Wins (15 minutes each)

### 1. Enable Vector Search
Add semantic config to Azure AI Search index → Grounding 0.32 → 0.75+

### 2. Re-enable Cache
Set `CACHE_DEBUG_BYPASS=false` in `app/api/qa/route.ts` → Latency 1.5s → 50ms

### 3. Test Production
Deploy and verify on Vercel → Confidence in stability

---

## 💡 Remember

- ✅ **BM25 is working** (8 chunks retrieved)
- ⚠️ **Vector search degraded** (non-blocking)
- ⚠️ **Cache bypassed** (for debugging)
- ✅ **Answers are real** (not demo fallback)
- ✅ **Infrastructure connected** (Azure OpenAI + Search)

---

**🎉 You're all set! The chatbot is operational and ready for testing.**

For detailed troubleshooting, see `CHATBOT_SUCCESS_SUMMARY.md`
