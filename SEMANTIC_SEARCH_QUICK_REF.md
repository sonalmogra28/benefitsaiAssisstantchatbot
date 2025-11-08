# Quick Reference: Fix Azure Search Semantic Config

## � ONE COMMAND FIX (Recommended)

```powershell
.\fix-qa-assistant.ps1
```

This automated script will:
1. ✓ Diagnose current issues
2. ✓ Update index with semantic configuration
3. ✓ Populate documents from Azure Blob Storage
4. ✓ Verify everything works
5. ✓ Test QA endpoint

**What you need:**
- Azure Search Service Name (e.g., `amerivetasschatbotsearch`)
- Azure Search Admin API Key (from Azure Portal → Search Service → Keys)
- Documents uploaded to Azure Blob Storage `documents` container

**Time:** ~15-35 minutes (mostly document ingestion)

---

## 🔍 Manual Diagnosis (Alternative)

```powershell
cd infra\azure
$env:AZURE_SEARCH_SERVICE_NAME = "amerivetasschatbotsearch"
$env:AZURE_SEARCH_API_KEY = "<your-admin-key>"
.\check-search-index.ps1
```

This will tell you:
- ✓ Does index exist?
- ✓ Does it have semantic configuration?
- ✓ How many documents are indexed?
- ✓ Does a test search work?

## Manual Step-by-Step Actions

### 1. Update Azure Search Index (Choose One Method)

**Method A: PowerShell Script (Easiest)**
```powershell
cd infra\azure
$env:AZURE_SEARCH_SERVICE_NAME = "amerivetasschatbotsearch"
$env:AZURE_SEARCH_API_KEY = "<your-admin-key>"
.\update-search-index.ps1
```

**Method B: Azure Portal**
1. Portal → AI Search → Your Service → Indexes → chunks_prod_v1
2. JSON View → Add semantic configuration from `search-index-schema.json`
3. Save

### 2. Re-Index Documents
```powershell
python ingest_real_documents_sdk.py
```

### 3. Clean Production Env Vars
```powershell
# Via Vercel Dashboard or CLI
vercel env rm AZURE_SEARCH_INDEX production
vercel env add AZURE_SEARCH_INDEX production
# Enter: chunks_prod_v1

vercel --prod
```

### 4. Test
```powershell
.\test-qa-local.ps1
```

## What Was Fixed

✅ **Environment Variable Trimming**
- Added `.trim()` to all Azure config values
- Prevents CRLF (`\r\n`) characters from breaking API calls
- Files: `lib/azure/config.ts`, `.env.local`

✅ **Semantic Search Configuration**
- Created `search-index-schema.json` with semantic config
- Enables AI-powered re-ranking and captions
- Sets `default` configuration for SDK compatibility

✅ **Testing & Diagnostics**
- `/api/debug/config-check` - Verify config parsing
- `test-qa-local.ps1` - Test QA endpoint locally
- `update-search-index.ps1` - Apply schema changes

## Expected Results

### Before
- ❌ "Semantic configuration 'default' not found"
- ❌ Fallback message: "I don't have specific information..."
- ❌ No search results from Azure

### After
- ✅ Actual answers about HSA plans from documents
- ✅ Sources showing document chunks
- ✅ Grounding score > 0.7
- ✅ Tier routing (L1/L2/L3) working

## Verification Checklist

```powershell
# 1. Config is clean
Invoke-RestMethod http://127.0.0.1:3000/api/debug/config-check
# Check: searchIndexName = "chunks_prod_v1" (length 15, no CRLF)
# Check: embeddingDeployment = "text-embedding-3-large" (length 22)

# 2. Index has semantic config
az search index show --service-name amerivetasschatbotsearch --name chunks_prod_v1
# Look for: "semantic": { "defaultConfiguration": "default" }

# 3. Documents exist
# Should show count > 0

# 4. QA works
.\test-qa-local.ps1
# Should return actual answer, not fallback
```

## Files

| File | Purpose |
|------|---------|
| `infra/azure/search-index-schema.json` | Complete index definition with semantic config |
| `infra/azure/update-search-index.ps1` | Apply schema to Azure Search |
| `test-qa-local.ps1` | Test QA endpoint locally |
| `docs/AZURE_SEARCH_SEMANTIC_SETUP.md` | Full setup guide |
| `.env.local` | Clean local environment variables |
| `lib/azure/config.ts` | Trimmed Azure config parsing |

## Troubleshooting

**"Cannot reach dev server"**
→ Run `npm run dev` in separate terminal

**"Semantic configuration not found"**
→ Run `update-search-index.ps1` again

**"Empty search results"**
→ Re-run ingestion: `python ingest_real_documents_sdk.py`

**"Still getting fallback"**
→ Restart server after env var changes
→ Check logs for Azure errors
→ Verify index populated via Portal

## Next Deploy

```powershell
# After testing locally
git add -A
git commit -m "Applied semantic search configuration"
git push origin consolidated/copilot-vscode-latest
vercel --prod
```

Full documentation: `docs/AZURE_SEARCH_SEMANTIC_SETUP.md`
