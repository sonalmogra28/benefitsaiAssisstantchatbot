# 🚨 URGENT: Fix QA Assistant Fallback Messages

## Problem Diagnosis

Your production QA assistant returns:
> "I'm having trouble finding specific information about..."

**Root Cause:** Zero retrieval results from Azure Search due to:

### Issue 1: Environment Variables Contain CRLF Characters ❌
```
AZURE_SEARCH_INDEX="chunks_prod_v1\r\n"  ❌ Has \r\n
AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-3-large\r\n"  ❌ Has \r\n
```

**Impact:** Even with `.trim()` in code, Vercel's stored values have literal `\r\n` characters that break API calls.

### Issue 2: Azure Search Index Missing Semantic Configuration ❌
The index `chunks_prod_v1` exists but has no `semanticConfiguration` defined.

**Impact:** When code calls:
```typescript
semanticConfiguration: "default"  // ❌ FAILS - "default" doesn't exist
```
The search query fails and returns 0 results.

### Issue 3: Index May Be Empty ❌
Even if config is fixed, if no documents are ingested, searches return 0 results.

---

## 🎯 THE FIX (Choose One Method)

### Method A: Automated Script (Recommended)

```powershell
# Step 1: Clean Vercel env vars
.\clean-vercel-env-vars.ps1

# Step 2: Redeploy
vercel --prod

# Step 3: Fix Azure Search (takes 15-30 min)
.\fix-qa-assistant.ps1
```

**Total time:** ~20-40 minutes (mostly document ingestion)

---

### Method B: Manual Step-by-Step

#### Step 1: Clean Vercel Environment Variables (5 minutes)

**Option A: Vercel Dashboard (Safest)**
1. Go to https://vercel.com/melodie-s-projects/benefitsaichatbot-sm/settings/environment-variables
2. For **each** variable below:
   - Click the **⋮** menu → **Delete**
   - Click **Add New** → Enter name and value **by typing** (don't paste!)
   
   | Variable Name | Clean Value |
   |--------------|-------------|
   | `AZURE_SEARCH_INDEX` | `chunks_prod_v1` |
   | `AZURE_SEARCH_INDEX_NAME` | `chunks_prod_v1` |
   | `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | `text-embedding-3-large` |
   | `AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT` | `text-embedding-3-large` |

3. Click **Save**

**Option B: Vercel CLI**
```powershell
.\clean-vercel-env-vars.ps1
```

#### Step 2: Redeploy (1 minute)
```powershell
vercel --prod
```

Wait for deployment to complete.

#### Step 3: Verify Env Vars Are Clean (30 seconds)
```powershell
# Check production config
curl https://benefitsaichatbot-2jcvb7ll0-melodie-s-projects.vercel.app/api/debug/config-check | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

Look for:
```json
{
  "openai": {
    "embeddingDeployment": "text-embedding-3-large",  // ✓ No \r\n
    "embeddingDeploymentLength": 22                    // ✓ Correct length
  },
  "env": {
    "AZURE_SEARCH_INDEX": "chunks_prod_v1",          // ✓ No \r\n  
    "AZURE_SEARCH_INDEX_LENGTH": 15                    // ✓ Correct length
  }
}
```

If you see lengths like `17` (should be `15`) or `24` (should be `22`), the `\r\n` is still there.

#### Step 4: Update Azure Search Index (2 minutes)

Get your credentials from Azure Portal:
- Go to **Azure Portal** → **Azure AI Search** → Your service
- Click **Keys** → Copy **Primary admin key**

```powershell
cd infra\azure

$env:AZURE_SEARCH_SERVICE_NAME = "amerivetasschatbotsearch"
$env:AZURE_SEARCH_API_KEY = "<paste-admin-key-here>"

# Check current state
.\check-search-index.ps1

# Apply semantic configuration
.\update-search-index.ps1
```

Expected output:
```
✓ Index updated successfully
✓ Semantic configurations:
  - default (default)
```

#### Step 5: Populate Documents (15-30 minutes)

```powershell
cd ..\..

# Ensure .env.production.local exists in secrets folder
# If not, copy from .vercel\.env.production.local
$secretsPath = "C:\Users\sonal\secrets\benefitsaichatbot-383"
if (-not (Test-Path $secretsPath)) {
    mkdir $secretsPath
}
Copy-Item .vercel\.env.production.local "$secretsPath\.env.production"

# Run ingestion
.\populate-search-index.ps1
```

This will:
- Extract text from PDFs/DOCX in Azure Blob Storage
- Generate embeddings using Azure OpenAI
- Upload chunks to Azure Search with vectors
- **Takes 10-30 minutes** depending on document count

#### Step 6: Verify Index Has Documents (30 seconds)

```powershell
cd infra\azure
.\check-search-index.ps1
```

Expected output:
```
✓ Index exists
✓ Semantic configurations found:
  - default (DEFAULT)
✓ 247 documents indexed          ← Should be > 0
  Storage size: 2.45 MB
✓ Found 5 results for 'HSA'
```

#### Step 7: Test Production (1 minute)

Go to: https://benefitsaichatbot-2jcvb7ll0-melodie-s-projects.vercel.app

Ask:
```
What dental and vision benefits are available?
```

**Expected Result (Success):**
```
Based on your benefits documents, dental coverage includes:
- Preventive care (cleanings, exams) covered at 100%
- Orthodontics for dependents under 19: 50% coverage up to $1,500 lifetime maximum
- Vision coverage includes annual eye exams and $150 allowance for frames/lenses

[Shows sources and document references]
```

**Failure (Still Broken):**
```
I'm having trouble finding specific information about "what dental and vision..."
```

If still broken, check logs:
```powershell
vercel logs https://benefitsaichatbot-2jcvb7ll0-melodie-s-projects.vercel.app --follow
```

---

## 📋 Troubleshooting

### Issue: "Semantic configuration 'default' not found"
**Fix:** Run `.\update-search-index.ps1` again. Verify in Azure Portal that semantic config exists.

### Issue: Still seeing CRLF in debug output
**Fix:** Delete and manually **type** (don't paste) env var values in Vercel dashboard.

### Issue: "Index is EMPTY (0 documents)"
**Fix:** Run `.\populate-search-index.ps1`. Check that documents exist in Azure Blob Storage `documents` container.

### Issue: "Connection string invalid"
**Fix:** Verify `.env.production` file in secrets folder has correct values. Check for CRLF in that file too:
```powershell
$content = Get-Content "C:\Users\sonal\secrets\benefitsaichatbot-383\.env.production" -Raw
$content = $content.Replace("`r`n", "`n")  # Convert CRLF to LF
$content | Out-File "C:\Users\sonal\secrets\benefitsaichatbot-383\.env.production" -Encoding UTF8 -NoNewline
```

### Issue: Python ingestion fails
**Check:**
1. Python virtual environment activated
2. Dependencies installed: `pip install azure-storage-blob azure-search-documents PyPDF2 python-docx openai`
3. Credentials correct in secrets file
4. Documents exist in Azure Blob Storage

---

## ✅ Success Checklist

- [ ] Vercel env vars cleaned (no `\r\n`)
- [ ] Production redeployed
- [ ] `/api/debug/config-check` shows correct lengths
- [ ] Azure Search index has semantic configuration
- [ ] Index has documents (count > 0)
- [ ] Test search returns results
- [ ] Production QA returns real answers (not fallback)

---

## 📊 Expected Timeline

| Step | Time | Critical? |
|------|------|-----------|
| Clean Vercel env vars | 5 min | ✅ YES |
| Redeploy | 1 min | ✅ YES |
| Verify config | 30 sec | ✅ YES |
| Update index schema | 2 min | ✅ YES |
| Populate documents | 15-30 min | ✅ YES |
| Verify & test | 2 min | ✅ YES |
| **TOTAL** | **20-40 min** | |

---

## 🎯 Quick Reference: All Scripts

| Script | Purpose | Time |
|--------|---------|------|
| `clean-vercel-env-vars.ps1` | Remove CRLF from Vercel env vars | 1 min |
| `infra/azure/check-search-index.ps1` | Diagnose index status | 30 sec |
| `infra/azure/update-search-index.ps1` | Add semantic configuration | 1 min |
| `populate-search-index.ps1` | Ingest documents | 15-30 min |
| `fix-qa-assistant.ps1` | **ALL-IN-ONE** automated fix | 20-40 min |
| `test-qa-local.ps1` | Test QA endpoint locally | 10 sec |

---

## 🆘 Still Not Working?

If after following all steps you still see fallback messages:

1. **Check production logs:**
   ```powershell
   vercel logs https://benefitsaichatbot-2jcvb7ll0-melodie-s-projects.vercel.app --follow
   ```

2. **Look for specific errors:**
   - "Resource not found" → Embedding deployment name still wrong
   - "Semantic configuration not found" → Index update didn't work
   - "Connection failed" → Redis/Search credentials wrong
   - "Zero results" → Index is empty

3. **Re-run diagnostics:**
   ```powershell
   cd infra\azure
   .\check-search-index.ps1
   ```

4. **Contact me** with:
   - Output from `check-search-index.ps1`
   - Output from `/api/debug/config-check`
   - Vercel deployment logs
   - Screenshot of error message

---

**Bottom Line:** The code fixes are deployed. You just need to clean the environment variables manually and populate the search index. Then it will work! 🎯
