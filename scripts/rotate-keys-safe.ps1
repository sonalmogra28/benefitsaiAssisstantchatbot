# Safe Azure Key Rotation Script
# Rotates keys for Cosmos DB, Redis, and Storage Account
# Saves new keys to secure location outside repo

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup = "benefits-chatbot-project"
)

$ErrorActionPreference = "Stop"

function Log($msg, $color="White") { Write-Host $msg -ForegroundColor $color }

Log "`n=== Azure Key Rotation ===" "Cyan"
Log "Resource Group: $ResourceGroup" "Yellow"

# Check Azure CLI auth
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Log "❌ Not logged into Azure CLI. Run: az login" "Red"
    exit 1
}
Log "✅ Logged in as: $($account.user.name)`n" "Green"

# Resource names (from inventory)
$cosmosName = "amerivetcdbprod"
$redisName = "amerivetcacheredis"
$storageName = "amerivetdocsprod"

# 1) Rotate Cosmos DB Primary Key
Log "[1/3] Rotating Cosmos DB primary key ($cosmosName)..." "Cyan"
try {
    az cosmosdb keys regenerate `
        --resource-group $ResourceGroup `
        --name $cosmosName `
        --key-kind primary `
        --output none
    Log "✅ Cosmos DB key rotated" "Green"
} catch {
    Log "❌ Failed to rotate Cosmos DB key: $_" "Red"
    exit 1
}

# 2) Rotate Redis Primary Key
Log "`n[2/3] Rotating Redis primary key ($redisName)..." "Cyan"
try {
    az redis regenerate-keys `
        --resource-group $ResourceGroup `
        --name $redisName `
        --key-type Primary `
        --output none
    Log "✅ Redis key rotated" "Green"
} catch {
    Log "❌ Failed to rotate Redis key: $_" "Red"
    exit 1
}

# 3) Rotate Storage Account key1
Log "`n[3/3] Rotating Storage Account key1 ($storageName)..." "Cyan"
try {
    az storage account keys renew `
        --resource-group $ResourceGroup `
        --account-name $storageName `
        --key key1 `
        --output none
    Log "✅ Storage key rotated" "Green"
} catch {
    Log "❌ Failed to rotate Storage key: $_" "Red"
    exit 1
}

# Retrieve new keys
Log "`n=== Retrieving new keys ===" "Cyan"

$cosmosEndpoint = az cosmosdb show `
    --resource-group $ResourceGroup `
    --name $cosmosName `
    --query documentEndpoint `
    --output tsv

$cosmosKey = az cosmosdb keys list `
    --resource-group $ResourceGroup `
    --name $cosmosName `
    --type keys `
    --query primaryMasterKey `
    --output tsv

$redisHostname = az redis show `
    --resource-group $ResourceGroup `
    --name $redisName `
    --query hostName `
    --output tsv

$redisKey = az redis list-keys `
    --resource-group $ResourceGroup `
    --name $redisName `
    --query primaryKey `
    --output tsv

$storageConnString = az storage account show-connection-string `
    --resource-group $ResourceGroup `
    --name $storageName `
    --query connectionString `
    --output tsv

Log "✅ Keys retrieved`n" "Green"

# Create secure directory outside repo
$secretsDir = "$env:USERPROFILE\secrets\benefitsaichatbot-383"
if (-not (Test-Path $secretsDir)) {
    New-Item -ItemType Directory -Path $secretsDir -Force | Out-Null
    Log "Created secure directory: $secretsDir" "Yellow"
}

# Save to .env.production (NOT in repo)
$envFile = Join-Path $secretsDir ".env.production"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$envContent = @"
# Azure Production Credentials - Rotated on $timestamp
# NEVER COMMIT THIS FILE TO GIT

# Cosmos DB
AZURE_COSMOS_ENDPOINT=$cosmosEndpoint
AZURE_COSMOS_KEY=$cosmosKey

# Redis Cache
REDIS_URL=rediss://:$redisKey@${redisHostname}:6380
RATE_LIMIT_REDIS_URL=rediss://:$redisKey@${redisHostname}:6380

# Storage Account
AZURE_STORAGE_CONNECTION_STRING=$storageConnString

# Application Settings
NODE_ENV=production
LOG_LEVEL=info
NEXT_PUBLIC_ENVIRONMENT=production

# Rotation Metadata
LAST_ROTATED=$timestamp
ROTATED_BY=$($account.user.name)

# ===== MANUAL ROTATION REQUIRED =====
# Complete in Azure Portal and add below:
#
# Azure Search (amerivetsearch):
# AZURE_SEARCH_ENDPOINT=https://amerivetsearch.search.windows.net
# AZURE_SEARCH_API_KEY=<rotate in Portal: Keys → Regenerate Primary Admin Key>
# AZURE_SEARCH_INDEX_NAME=chunks_prod_v1
# AZURE_SEARCH_VECTOR_FIELD=content_vector
#
# Azure OpenAI (amerivetopenai):
# AZURE_OPENAI_ENDPOINT=https://amerivetopenai.openai.azure.com
# AZURE_OPENAI_API_KEY=<rotate in Portal: Keys and Endpoint → Regenerate Key 1>
# AZURE_OPENAI_API_VERSION=2024-02-15-preview
# AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
# AZURE_OPENAI_DEPLOYMENT_L1=gpt-4o-mini
# AZURE_OPENAI_DEPLOYMENT_L2=gpt-4o-mini
# AZURE_OPENAI_DEPLOYMENT_L3=gpt-4o-mini
#
# Auth & Domain:
# NEXTAUTH_URL=https://amerivetaibot.bcgenrolls.com
# NEXTAUTH_SECRET=<generate: openssl rand -base64 32>
# DOMAIN_ROOT=bcgenrolls.com
"@

Set-Content -Path $envFile -Value $envContent -Force
Log "✅ Saved to: $envFile`n" "Green"

Log "=== Next Steps ===" "Yellow"
Log "1. Open Azure Portal and rotate:" "White"
Log "   • Azure Search (amerivetsearch) → Keys → Regenerate Primary Admin Key" "White"
Log "   • Azure OpenAI (amerivetopenai) → Keys and Endpoint → Regenerate Key 1" "White"
Log "`n2. Edit $envFile" "White"
Log "   • Add AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_API_KEY" "White"
Log "   • Add AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY" "White"
Log "   • Verify deployment names match your Azure OpenAI deployments" "White"
Log "`n3. Run: .\scripts\sync-vercel-env.ps1" "White"
Log "4. Run: npm ci && npm run build && vercel --prod --force`n" "White"

Log "⚠️  Old keys are now INVALID" "Red"
