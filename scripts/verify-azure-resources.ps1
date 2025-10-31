#!/usr/bin/env pwsh
# Quick Azure Resource Verification via Azure CLI

$rg = "benefits-chatbot-project"

Write-Host "=== Azure Resources Verification ===" -ForegroundColor Cyan
Write-Host ""

$allSuccess = $true

# 1. Cosmos DB
Write-Host "[1/5] Cosmos DB..." -NoNewline
try {
    $cosmos = az cosmosdb show --name "benefits-chatbot-cosmos-dev" --resource-group $rg 2>&1 | ConvertFrom-Json
    if ($cosmos.provisioningState -eq "Succeeded") {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " WARN: $($cosmos.provisioningState)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    $allSuccess = $false
}

# 2. Azure AI Search
Write-Host "[2/5] Azure AI Search..." -NoNewline
try {
    $search = az search service show --name "benefits-chatbot-search" --resource-group $rg 2>&1 | ConvertFrom-Json
    if ($search.provisioningState -eq "succeeded") {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " WARN: $($search.provisioningState)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    $allSuccess = $false
}

# 3. Redis Cache
Write-Host "[3/5] Redis Cache..." -NoNewline
try {
    $redis = az redis show --name "benefits-chatbot-redis-dev" --resource-group $rg 2>&1 | ConvertFrom-Json
    if ($redis.provisioningState -eq "Succeeded") {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " WARN: $($redis.provisioningState)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    $allSuccess = $false
}

# 4. Storage Account
Write-Host "[4/5] Storage Account..." -NoNewline
try {
    $storage = az storage account show --name "benefitschatbotdev" --resource-group $rg 2>&1 | ConvertFrom-Json
    if ($storage.provisioningState -eq "Succeeded") {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " WARN: $($storage.provisioningState)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    $allSuccess = $false
}

# 5. Azure OpenAI
Write-Host "[5/5] Azure OpenAI..." -NoNewline
try {
    $openai = az cognitiveservices account show --name "benefits-chatbot-openai2" --resource-group $rg 2>&1 | ConvertFrom-Json
    if ($openai.provisioningState -eq "Succeeded") {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " WARN: $($openai.provisioningState)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    $allSuccess = $false
}

Write-Host ""
if ($allSuccess) {
    Write-Host "All Azure resources verified!" -ForegroundColor Green
} else {
    Write-Host "Some resources failed verification" -ForegroundColor Red
    exit 1
}
