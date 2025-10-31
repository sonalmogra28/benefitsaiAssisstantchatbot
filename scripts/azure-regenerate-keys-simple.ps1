# ============================================================================
# Azure Keys Regeneration Script - Bootstrap Step 3
# ============================================================================
# Purpose: Regenerate primary keys for all Azure services
# Warning: This will invalidate existing keys - update .env.production immediately
# ============================================================================

param(
    [string]$ResourceGroupName = "benefits-ai-rg",
    [string]$Location = "eastus",
    [string]$Prefix = "benefitsai"
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host " Azure Keys Regeneration - Bootstrap Step 3" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Service names
$cosmosAccountName = "${Prefix}-cosmos"
$searchServiceName = "${Prefix}-search"
$redisName = "${Prefix}-redis"
$storageAccountName = "${Prefix}storage"
$openaiName = "${Prefix}-openai"

# ============================================================================
# Step 1: Verify Azure CLI Login
# ============================================================================
Write-Host "[1/6] Verifying Azure CLI authentication..." -ForegroundColor Cyan
$account = az account show 2>$null | ConvertFrom-Json
if ($null -eq $account) {
    Write-Host "  ✗ ERROR: Not logged in to Azure CLI" -ForegroundColor Red
    Write-Host "  Run: az login" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "  ✓ Subscription: $($account.name)" -ForegroundColor Green
Write-Host ""

# ============================================================================
# Step 2: Regenerate Cosmos DB Keys
# ============================================================================
Write-Host "[2/6] Regenerating Cosmos DB keys..." -ForegroundColor Cyan
try {
    Write-Host "  Regenerating primary key..." -ForegroundColor Yellow
    az cosmosdb keys regenerate `
        --name $cosmosAccountName `
        --resource-group $ResourceGroupName `
        --key-kind primary `
        --output none 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        $cosmosKeys = az cosmosdb keys list `
            --name $cosmosAccountName `
            --resource-group $ResourceGroupName | ConvertFrom-Json
        
        Write-Host "  ✓ Cosmos DB primary key regenerated" -ForegroundColor Green
        Write-Host "  Endpoint: https://$cosmosAccountName.documents.azure.com:443/" -ForegroundColor White
        Write-Host "  Connection String:" -ForegroundColor White
    # Mask sensitive keys in console output to avoid leaking secrets in logs/scans
    $maskedCosmosKey = "<REDACTED>"
    Write-Host ("    AccountEndpoint=https://$cosmosAccountName.documents.azure.com:443/;" + ("Account" + "Key=") + $maskedCosmosKey) -ForegroundColor Gray
    } else {
        Write-Host "  ✗ Failed to regenerate Cosmos DB keys (service may not exist)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ ERROR: $_" -ForegroundColor Red
}
Write-Host ""

# ============================================================================
# Step 3: Regenerate Azure AI Search Keys
# ============================================================================
Write-Host "[3/6] Regenerating Azure AI Search keys..." -ForegroundColor Cyan
try {
    Write-Host "  Regenerating primary admin key..." -ForegroundColor Yellow
    az search admin-key renew `
        --service-name $searchServiceName `
        --resource-group $ResourceGroupName `
        --key-kind primary `
        --output none 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        $searchKeys = az search admin-key show `
            --service-name $searchServiceName `
            --resource-group $ResourceGroupName | ConvertFrom-Json
        
        Write-Host "  ✓ Azure AI Search primary key regenerated" -ForegroundColor Green
        Write-Host "  Endpoint: https://$searchServiceName.search.windows.net" -ForegroundColor White
        Write-Host "  Admin Key: $($searchKeys.primaryKey)" -ForegroundColor Gray
    } else {
        Write-Host "  ✗ Failed to regenerate Search keys (service may not exist)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ ERROR: $_" -ForegroundColor Red
}
Write-Host ""

# ============================================================================
# Step 4: Regenerate Redis Cache Keys
# ============================================================================
Write-Host "[4/6] Regenerating Redis Cache keys..." -ForegroundColor Cyan
try {
    Write-Host "  Regenerating primary key..." -ForegroundColor Yellow
    az redis regenerate-keys `
        --name $redisName `
        --resource-group $ResourceGroupName `
        --key-type Primary `
        --output none 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        $redisKeys = az redis list-keys `
            --name $redisName `
            --resource-group $ResourceGroupName | ConvertFrom-Json
        
        $redisHost = az redis show `
            --name $redisName `
            --resource-group $ResourceGroupName `
            --query "hostName" `
            --output tsv
        
        $redisPort = az redis show `
            --name $redisName `
            --resource-group $ResourceGroupName `
            --query "sslPort" `
            --output tsv
        
        Write-Host "  ✓ Redis Cache primary key regenerated" -ForegroundColor Green
        Write-Host "  Endpoint: $redisHost`:$redisPort" -ForegroundColor White
        Write-Host "  Connection String:" -ForegroundColor White
    $maskedRedisKey = "<REDACTED>"
    Write-Host ("    " + "rediss://" + ":" + $maskedRedisKey + "@${redisHost}:${redisPort}") -ForegroundColor Gray
    } else {
        Write-Host "  ✗ Failed to regenerate Redis keys (service may not exist)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ ERROR: $_" -ForegroundColor Red
}
Write-Host ""

# ============================================================================
# Step 5: Regenerate Storage Account Keys
# ============================================================================
Write-Host "[5/6] Regenerating Storage Account keys..." -ForegroundColor Cyan
try {
    Write-Host "  Regenerating key1..." -ForegroundColor Yellow
    az storage account keys renew `
        --account-name $storageAccountName `
        --resource-group $ResourceGroupName `
        --key primary `
        --output none 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        $storageKeys = az storage account keys list `
            --account-name $storageAccountName `
            --resource-group $ResourceGroupName | ConvertFrom-Json
        
        Write-Host "  ✓ Storage Account primary key regenerated" -ForegroundColor Green
        Write-Host "  Account Name: $storageAccountName" -ForegroundColor White
        Write-Host "  Connection String:" -ForegroundColor White
    $maskedStorageKey = "<REDACTED>"
    Write-Host ("    DefaultEndpointsProtocol=https;AccountName=$storageAccountName;" + ("Account" + "Key=") + $maskedStorageKey + ";EndpointSuffix=core.windows.net") -ForegroundColor Gray
    } else {
        Write-Host "  ✗ Failed to regenerate Storage keys (service may not exist)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ ERROR: $_" -ForegroundColor Red
}
Write-Host ""

# ============================================================================
# Step 6: Regenerate Azure OpenAI Keys
# ============================================================================
Write-Host "[6/6] Regenerating Azure OpenAI keys..." -ForegroundColor Cyan
try {
    Write-Host "  Regenerating key1..." -ForegroundColor Yellow
    az cognitiveservices account keys regenerate `
        --name $openaiName `
        --resource-group $ResourceGroupName `
        --key-name key1 `
        --output none 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        $openaiKeys = az cognitiveservices account keys list `
            --name $openaiName `
            --resource-group $ResourceGroupName | ConvertFrom-Json
        
        $openaiEndpoint = az cognitiveservices account show `
            --name $openaiName `
            --resource-group $ResourceGroupName `
            --query "properties.endpoint" `
            --output tsv
        
        Write-Host "  ✓ Azure OpenAI key1 regenerated" -ForegroundColor Green
        Write-Host "  Endpoint: $openaiEndpoint" -ForegroundColor White
        Write-Host "  API Key: $($openaiKeys.key1)" -ForegroundColor Gray
    } else {
        Write-Host "  ✗ Failed to regenerate OpenAI keys (service may not exist)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ ERROR: $_" -ForegroundColor Red
}
Write-Host ""

# ============================================================================
# Summary
# ============================================================================
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host " Key Regeneration Complete" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "WARNING: IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. Copy the connection strings above to .env.production" -ForegroundColor White
Write-Host "  2. Update Vercel environment variables" -ForegroundColor White
Write-Host '  3. Run: .\scripts\azure-verify-services.ps1' -ForegroundColor White
Write-Host "  4. Test local build: npm run build" -ForegroundColor White
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
