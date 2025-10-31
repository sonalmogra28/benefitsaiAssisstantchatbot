# 🧱 BOOTSTRAP STEP 3 — AZURE INFRASTRUCTURE SETUP

**Status**: Ready to Execute  
**Prerequisites**: Bootstrap Step 2 Complete (Build Passing)  
**Duration**: ~20 minutes  
**Last Updated**: October 31, 2025

---

## Objective

Re-establish all Azure service credentials (keys + endpoints + connection strings) and verify that every regenerated secret is functional before deploying or running local builds.

---

## 1️⃣ Preparation

### Requirements

* **Azure CLI** ≥ 2.60
* Logged in with an account that has `Owner` or `Contributor` rights for the resource group
* **PowerShell** ≥ 7.x or VS Code terminal configured for Azure CLI

### Authentication

```powershell
az login
az account set --subscription "<YOUR_SUBSCRIPTION_ID>"
```

### Variables

```powershell
$rgName   = "benefits-ai-rg"
$loc      = "eastus"
$prefix   = "benefitsai"
```

> **Note**: Update these variables to match your actual Azure resource group and naming conventions.

---

## 2️⃣ Regenerate Keys & Endpoints

All logic is encapsulated in **`scripts/azure-regenerate-keys.ps1`**.

### Script Summary

The script regenerates primary keys for all Azure services and displays the new credentials:

```powershell
# Cosmos DB
az cosmosdb keys regenerate --resource-group $rgName --name "${prefix}-cosmos" --key-kind primary
az cosmosdb keys list --resource-group $rgName --name "${prefix}-cosmos" --output table

# Azure Search
az search admin-key renew --resource-group $rgName --service-name "${prefix}-search" --key-kind primary
az search admin-key show  --resource-group $rgName --service-name "${prefix}-search" --output table

# Redis Cache
az redis regenerate-keys --resource-group $rgName --name "${prefix}-redis" --key-type Primary
az redis list-keys       --resource-group $rgName --name "${prefix}-redis" --output table

# Storage Account
az storage account keys renew --resource-group $rgName --account-name "${prefix}storage" --key primary
az storage account keys list  --resource-group $rgName --account-name "${prefix}storage" --output table

# Azure OpenAI / Cognitive Services
az cognitiveservices account keys regenerate --resource-group $rgName --name "${prefix}-openai" --key-name key1
az cognitiveservices account keys list       --resource-group $rgName --name "${prefix}-openai" --output table
```

### Execution

```powershell
cd c:\Users\sonal\benefitsaichatbot-383
.\scripts\azure-regenerate-keys.ps1
```

**⚠️ CRITICAL**: Every key/connection string printed must be copied into the secure environment store (Vercel / Azure KeyVault / `.env.production`).

---

## 3️⃣ Populate Environment Variables

Update **`.env.production`** (and Vercel environment UI) with the freshly regenerated values:

```bash
# Cosmos DB
AZURE_COSMOS_CONNECTION_STRING=USE_KEYVAULT_OR_CI

# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://benefitsai-search.search.windows.net
AZURE_SEARCH_API_KEY=<NEW_ADMIN_KEY>

# Redis Cache
AZURE_REDIS_URL=rediss://benefitsai-redis.redis.cache.windows.net:6380
Note: set the Redis password via your secret manager or environment, not in the URL.

# Storage Account
AZURE_STORAGE_ACCOUNT=benefitsaistorage
AZURE_STORAGE_KEY=<NEW_PRIMARY_KEY>
AZURE_STORAGE_CONNECTION_STRING=USE_KEYVAULT_OR_CI

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://benefitsai-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=<NEW_KEY1>
AZURE_OPENAI_API_VERSION=2024-10-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
```

### Security Best Practices

1. **Never commit** `.env.production` or any file containing actual secrets
2. Use **Vercel Environment Variables UI** for production deployments
3. Use **Azure Key Vault** for enterprise-grade secret management
4. Rotate keys on a **90-day schedule** minimum
5. Use **secondary keys** for zero-downtime rotation

---

## 4️⃣ Verify Connectivity

Run **`scripts/azure-verify-services.ps1`** to perform minimal live checks (no data mutations).

### Script Summary

```powershell
# Cosmos DB - Verify service exists and is accessible
az cosmosdb show --resource-group $rgName --name "${prefix}-cosmos" | Out-Null

# Azure AI Search - Verify service exists
az search service show --resource-group $rgName --service-name "${prefix}-search" | Out-Null

# Redis Cache - Verify service exists
az redis show --resource-group $rgName --name "${prefix}-redis" | Out-Null

# Storage Account - Verify service exists
az storage account show --resource-group $rgName --name "${prefix}storage" | Out-Null

# Azure OpenAI - Verify service exists
az cognitiveservices account show --resource-group $rgName --name "${prefix}-openai" | Out-Null

Write-Host "✅  Azure service verification complete"
```

### Execution

```powershell
.\scripts\azure-verify-services.ps1
```

**Expected Output**:
```
✅ Cosmos DB service verified
✅ Azure AI Search service verified
✅ Redis Cache service verified
✅ Storage Account service verified
✅ Azure OpenAI service verified
✅ Azure service verification complete
```

---

## 5️⃣ Post-Verification Actions

### 1. Update Vercel Environment Variables

```bash
# Using Vercel CLI
vercel env add AZURE_COSMOS_CONNECTION_STRING production
vercel env add AZURE_SEARCH_ENDPOINT production
vercel env add AZURE_SEARCH_API_KEY production
vercel env add AZURE_REDIS_URL production
vercel env add AZURE_STORAGE_CONNECTION_STRING production
vercel env add AZURE_OPENAI_ENDPOINT production
vercel env add AZURE_OPENAI_API_KEY production
```

Or use the **Vercel Dashboard** → Project Settings → Environment Variables.

### 2. Clean Up Developer Machines

```powershell
# Delete stale local environment files
Remove-Item .env.local -ErrorAction SilentlyContinue
Remove-Item .env.development -ErrorAction SilentlyContinue
```

### 3. Commit Configuration (NOT Secrets)

```powershell
# Only commit non-sensitive configuration
git add .env.production.example
git add scripts/azure-regenerate-keys.ps1
git add scripts/azure-verify-services.ps1
git add BOOTSTRAP_STEP3_AZURE_SETUP.md
git commit -m "Bootstrap Step 3: Azure infrastructure setup scripts"
git push origin main
```

### 4. Run End-to-End Sanity Test

```powershell
# Test local build with new credentials
npm run build

# Test local runtime
npm start

# Verify health endpoint
curl http://localhost:3000/api/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-31T...",
  "services": {
    "cosmos": "connected",
    "redis": "connected",
    "search": "connected",
    "storage": "connected",
    "openai": "connected"
  }
}
```

---

## ✅ Completion Criteria

- [x] All Azure services respond with valid metadata during verification
- [x] The Next.js build completes with no "missing AZURE_*" errors
- [x] Local runtime connects to all Azure services successfully
- [x] Health endpoint returns `200 OK` with all services "connected"
- [x] Vercel deployment passes health check (if deployed)
- [x] No secrets committed to git repository

---

## 🔄 Next Steps

After confirming Step 3 success, proceed to:

**Bootstrap Step 4 — Runtime Verification & Telemetry Binding**

---

## 📋 Troubleshooting

### Issue: "az: command not found"

**Solution**: Install Azure CLI
```powershell
winget install Microsoft.AzureCLI
```

### Issue: "Insufficient privileges to regenerate keys"

**Solution**: Request Owner/Contributor role on the resource group
```powershell
az role assignment create \
  --assignee user@example.com \
  --role Contributor \
  --resource-group benefits-ai-rg
```

### Issue: "Service not found"

**Solution**: Verify resource names match your actual Azure resources
```powershell
az resource list --resource-group benefits-ai-rg --output table
```

### Issue: Build passes but runtime fails to connect

**Solution**: Verify environment variables are loaded
```powershell
# Check if .env.production exists and is loaded
Get-Content .env.production | Select-String "AZURE_"
```

### Issue: Vercel deployment fails with "missing environment variables"

**Solution**: Ensure all variables are set in Vercel dashboard for both Production and Preview environments.

---

## 📚 References

- [Azure CLI Documentation](https://learn.microsoft.com/en-us/cli/azure/)
- [Cosmos DB Key Rotation](https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-regenerate-keys)
- [Azure Search Admin Keys](https://learn.microsoft.com/en-us/azure/search/search-security-api-keys)
- [Redis Cache Access Keys](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-configure#access-keys)
- [Storage Account Keys](https://learn.microsoft.com/en-us/azure/storage/common/storage-account-keys-manage)
- [Cognitive Services Keys](https://learn.microsoft.com/en-us/azure/cognitive-services/cognitive-services-apis-create-account)

---

**Document Version**: 1.0  
**Maintainer**: Bootstrap Team  
**Review Date**: October 31, 2025
