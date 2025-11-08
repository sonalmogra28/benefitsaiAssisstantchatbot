# PRIORITY ACTIONS TO FIX QA ASSISTANT

## Problem Summary
Production QA assistant returns fallback "I'm having trouble finding specific information..." because:
1. **Environment variables contain `\r\n` characters** (CRLF from Windows)
2. **Azure Search index `chunks_prod_v1` missing semantic configuration**
3. **Index is empty** (no documents ingested)

## IMMEDIATE FIX (Manual - 20 minutes)

### Step 1: Clean Vercel Environment Variables (5 min)
Go to Vercel Dashboard → Project Settings → Environment Variables

**Delete and recreate these 4 variables:**
1. `AZURE_SEARCH_INDEX` → value: `chunks_prod_v1`
2. `AZURE_SEARCH_INDEX_NAME` → value: `chunks_prod_v1`
3. `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` → value: `text-embedding-3-large`
4. `AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT` → value: `text-embedding-3-large`

**Important**: Type values manually, don't copy-paste (avoids CRLF)

### Step 2: Update Azure Search Index Schema (5 min)
Run this from your terminal:
```powershell
cd infra\azure
.\update-search-index.ps1
```

Enter your Azure Search credentials when prompted:
- Service Name: `amerivetasschatbotsearch`  
- API Key: (from Azure Portal → Search Service → Keys)

This adds the required semantic configuration to the index.

### Step 3: Populate Documents (10-30 min)
```powershell
cd ..\..
.\populate-search-index.ps1
```

This will:
- Create Python virtual environment
- Install dependencies
- Ingest all documents from Azure Blob Storage
- Chunk and vectorize content
- Upload to Azure Search index

### Step 4: Verify & Deploy (2 min)
```powershell
# Check index has documents
cd infra\azure
.\check-search-index.ps1

# Redeploy to production
cd ..\..
vercel --prod
```

### Step 5: Test (1 min)
Visit: https://benefitsaichatbot-2jcvb7ll0-melodie-s-projects.vercel.app

Ask: "What dental and vision benefits are available?"

**Expected**: Real answer from documents (not fallback message)

## VERIFICATION CHECKLIST

✅ **Config Clean**: Visit `/api/debug/config-check` - should show:
   - `searchIndexName: "chunks_prod_v1"` (NO `\r` or `\n`)
   - `embeddingDeployment: "text-embedding-3-large"` (NO `\r` or `\n`)

✅ **Index Configured**: `.\check-search-index.ps1` shows:
   - Semantic configuration: `default` exists
   - Document count: > 0
   - Test search returns results

✅ **QA Working**: Production chat returns actual benefit information

## Troubleshooting

**Q: `update-search-index.ps1` fails**  
A: Check Azure Search Admin Key (not Query Key) from Azure Portal

**Q: `populate-search-index.ps1` fails**  
A: Ensure `.env.production` file exists at `C:\Users\sonal\secrets\benefitsaichatbot-383\`  
   Or run `vercel env pull` first to create `.vercel\.env.production.local`

**Q: Still getting fallback messages after fix**  
A: Check `/api/debug/config-check` - if you still see `\r` in values, manually edit in Vercel Dashboard

## Notes

- Runtime `.trim()` fixes are already deployed in code (commit 8ce6b84)
- Problem is the **stored values** in Vercel contain literal CRLF characters
- Must clean at source (Vercel Dashboard) for fix to work
- After cleaning, `.trim()` ensures they stay clean
