#!/usr/bin/env pwsh
# Azure Environment Setup (cleaned)
# Generates a trimmed `.env.local` from Azure

param()

$ErrorActionPreference = "Stop"
$env:AZURE_CORE_NO_COLOR = "true"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Azure Environment Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Checking Azure CLI login..." -ForegroundColor Yellow
try {
  $sub = (az account show --query name -o tsv).Trim()
  Write-Host "✓ Logged in: $sub`n" -ForegroundColor Green
} catch {
  Write-Host "✗ Not logged in. Run: az login" -ForegroundColor Red
  exit 1
}

$envPath = Join-Path $PWD ".env.local"
if (Test-Path $envPath) {
  Write-Host ".env.local already exists." -ForegroundColor Yellow
  $consent = Read-Host "Overwrite and regenerate env settings? (y/N)"
  if ($consent -notmatch '^(?i:y|yes)$') {
    Write-Host "Aborting without changes." -ForegroundColor Cyan
    exit 0
  }
}

Write-Host "Select Resource Group:" -ForegroundColor Yellow
$rgs = @((az group list --query "[].name" -o tsv).Trim() -split "`n" | Where-Object { $_ })
for ($i = 0; $i -lt $rgs.Length; $i++) {
  Write-Host "$($i + 1). $($rgs[$i])"
}
$sel = Read-Host "`nEnter number"
$rg = $rgs[[int]$sel - 1].Trim()
Write-Host "Using: $rg`n" -ForegroundColor Green

function Clean {
  param($val)
  if (!$val) { return "" }
  return $val.Trim() -replace "`r`n","" -replace "`n","" -replace "`r",""
}

Write-Host "Getting Azure OpenAI..." -ForegroundColor Yellow
$openaiName = Clean (az cognitiveservices account list --resource-group $rg --query "[?kind=='OpenAI'].name|[0]" -o tsv)
$openaiEndpoint = Clean (az cognitiveservices account show --name $openaiName --resource-group $rg --query "properties.endpoint" -o tsv)
$openaiKey = Clean (az cognitiveservices account keys list --name $openaiName --resource-group $rg --query "key1" -o tsv)
$openaiDeployment = Clean (az cognitiveservices account deployment list --name $openaiName --resource-group $rg --query "[0].name" -o tsv)
Write-Host "✓ $openaiName" -ForegroundColor Green

Write-Host "Getting Cosmos DB..." -ForegroundColor Yellow
$cosmosName = Clean (az cosmosdb list --resource-group $rg --query "[0].name" -o tsv)
$cosmosEndpoint = Clean (az cosmosdb show --name $cosmosName --resource-group $rg --query "documentEndpoint" -o tsv)
$cosmosKey = Clean (az cosmosdb keys list --name $cosmosName --resource-group $rg --query "primaryMasterKey" -o tsv)
Write-Host "✓ $cosmosName" -ForegroundColor Green

Write-Host "Getting Azure AI Search..." -ForegroundColor Yellow
$searchName = Clean (az search service list --resource-group $rg --query "[0].name" -o tsv)
$searchEndpoint = "https://$searchName.search.windows.net"
$searchKey = Clean (az search admin-key show --service-name $searchName --resource-group $rg --query "primaryKey" -o tsv)
$searchIndex = "benefits-documents"
Write-Host "✓ $searchName" -ForegroundColor Green

Write-Host "Getting Azure Storage..." -ForegroundColor Yellow
$storageName = Clean (az storage account list --resource-group $rg --query "[0].name" -o tsv)
$storageConn = Clean (az storage account show-connection-string --name $storageName --resource-group $rg --query "connectionString" -o tsv)
Write-Host "✓ $storageName" -ForegroundColor Green

Write-Host "Getting Redis Cache..." -ForegroundColor Yellow
$redisName = Clean (az redis list --resource-group $rg --query "[0].name" -o tsv)
if ($redisName) {
  $redisHost = Clean (az redis show --name $redisName --resource-group $rg --query "hostName" -o tsv)
  $redisKey = Clean (az redis list-keys --name $redisName --resource-group $rg --query "primaryKey" -o tsv)
  $redisPort = Clean (az redis show --name $redisName --resource-group $rg --query "sslPort" -o tsv)
  if (!$redisPort) { $redisPort = "6380" }
  $redisUrl = "rediss://:$redisKey@$redisHost`:$redisPort"
  Write-Host "✓ $redisName" -ForegroundColor Green
} else {
  $redisUrl = "redis://localhost:6379"
  Write-Host "✓ Using localhost" -ForegroundColor Yellow
}

$rngBytes = New-Object byte[] 32
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$rng.GetBytes($rngBytes)
$encKey = [Convert]::ToBase64String($rngBytes)
$authSecret = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes([Guid]::NewGuid().ToString()))

Write-Host "`nWriting .env.local..." -ForegroundColor Yellow
$lines = @"
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=$openaiEndpoint
AZURE_OPENAI_API_KEY=$openaiKey
AZURE_OPENAI_DEPLOYMENT_NAME=$openaiDeployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Azure Cosmos DB Configuration
AZURE_COSMOS_ENDPOINT=$cosmosEndpoint
AZURE_COSMOS_KEY=$cosmosKey
AZURE_COSMOS_DATABASE=BenefitsChat

# Azure AI Search Configuration
AZURE_SEARCH_ENDPOINT=$searchEndpoint
AZURE_SEARCH_ADMIN_KEY=$searchKey
AZURE_SEARCH_INDEX_NAME=$searchIndex

# Azure Storage Configuration
AZURE_STORAGE_CONNECTION_STRING=$storageConn
AZURE_STORAGE_CONTAINER_NAME=documents

# Redis Configuration
REDIS_URL=$redisUrl
RATE_LIMIT_REDIS_URL=$redisUrl

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$authSecret
AUTH_TRUST_HOST=true

# Application Security
SHARED_PASSWORD=demo-password-change-in-production
ENCRYPTION_KEY=$encKey

# Domain Configuration
DOMAIN_ROOT=localhost
NEXT_PUBLIC_ENVIRONMENT=development

# Feature Flags
FAST_HEALTH=1
ENABLE_ANALYTICS=1
ENABLE_AUDIT_LOGS=1

# Observability
LOG_LEVEL=info
ENABLE_TELEMETRY=1
"@

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($envPath, $lines + "`n", $utf8NoBom)

Write-Host "✓ Created .env.local" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. npm run dev"
Write-Host "2. Test: curl http://localhost:3000/api/qa`n"
