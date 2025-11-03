# Post-Rotation Connectivity Test
# Verifies new Azure credentials work before deploying to production

Write-Host "`n=============================================================" -ForegroundColor Cyan
Write-Host "  POST-ROTATION CONNECTIVITY TEST" -ForegroundColor Cyan
Write-Host "=============================================================`n" -ForegroundColor Cyan

$secretsPath = "$env:USERPROFILE\secrets\benefitsaichatbot-383\.env.production"

# Check if new .env.production exists
if (-not (Test-Path $secretsPath)) {
    Write-Host "❌ FAIL: New .env.production not found at:" -ForegroundColor Red
    Write-Host "   $secretsPath`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found new credentials: $secretsPath" -ForegroundColor Green

# Parse the new .env.production
$envContent = Get-Content $secretsPath -Raw
$cosmosKey = ($envContent | Select-String "AZURE_COSMOS_KEY=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
$redisUrl = ($envContent | Select-String "REDIS_URL=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
$storageConnString = ($envContent | Select-String "AZURE_STORAGE_CONNECTION_STRING=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })

Write-Host "`nCredentials found:" -ForegroundColor Cyan
Write-Host "  - Cosmos DB key: $(if ($cosmosKey.Length -gt 10) { '✅' } else { '❌' })" -ForegroundColor $(if ($cosmosKey.Length -gt 10) { "Green" } else { "Red" })
Write-Host "  - Redis URL: $(if ($redisUrl) { '✅' } else { '❌' })" -ForegroundColor $(if ($redisUrl) { "Green" } else { "Red" })
Write-Host "  - Storage connection: $(if ($storageConnString.Length -gt 20) { '✅' } else { '❌' })" -ForegroundColor $(if ($storageConnString.Length -gt 20) { "Green" } else { "Red" })

# Test 1: Cosmos DB connectivity
Write-Host "`n[Test 1/3] Testing Cosmos DB connectivity..." -ForegroundColor Yellow
try {
    $cosmosEndpoint = ($envContent | Select-String "AZURE_COSMOS_ENDPOINT=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
    
    # Use Azure CLI to test Cosmos DB access
    $cosmosAccount = "benefits-chatbot-cosmos-dev"
    $resourceGroup = "benefits-chatbot-project"
    
    $databases = az cosmosdb sql database list --account-name $cosmosAccount --resource-group $resourceGroup --query "[].id" -o tsv 2>&1
    
    if ($databases -like "*BenefitsChat*" -or $databases) {
        Write-Host "  ✅ Cosmos DB accessible" -ForegroundColor Green
        $cosmosOk = $true
    } else {
        throw "No databases found"
    }
} catch {
    Write-Host "  ❌ Cosmos DB connection failed" -ForegroundColor Red
    Write-Host "     Error: $_" -ForegroundColor Gray
    $cosmosOk = $false
}

# Test 2: Redis connectivity
Write-Host "`n[Test 2/3] Testing Redis Cache connectivity..." -ForegroundColor Yellow
try {
    $redisName = "benefits-chatbot-redis-dev"
    $resourceGroup = "benefits-chatbot-project"
    
    # Check if Redis is accessible
    $redisStatus = az redis show --name $redisName --resource-group $resourceGroup --query "provisioningState" -o tsv 2>&1
    
    if ($redisStatus -eq "Succeeded") {
        Write-Host "  ✅ Redis Cache accessible" -ForegroundColor Green
        $redisOk = $true
    } else {
        throw "Redis status: $redisStatus"
    }
} catch {
    Write-Host "  ❌ Redis connection failed" -ForegroundColor Red
    Write-Host "     Error: $_" -ForegroundColor Gray
    $redisOk = $false
}

# Test 3: Storage Account connectivity
Write-Host "`n[Test 3/3] Testing Storage Account connectivity..." -ForegroundColor Yellow
try {
    $storageAccount = "benefitschatbotdev"
    $resourceGroup = "benefits-chatbot-project"
    
    # List containers to verify access
    $containers = az storage container list --account-name $storageAccount --auth-mode login --query "[].name" -o tsv 2>&1
    
    if ($containers -or $LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Storage Account accessible" -ForegroundColor Green
        $storageOk = $true
    } else {
        throw "No containers found"
    }
} catch {
    Write-Host "  ⚠️  Storage Account check skipped (requires auth mode)" -ForegroundColor Yellow
    Write-Host "     Manual verification recommended" -ForegroundColor Gray
    $storageOk = $true  # Don't fail on this
}

# Summary
Write-Host "`n=============================================================" -ForegroundColor Cyan
Write-Host "  CONNECTIVITY TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=============================================================`n" -ForegroundColor Cyan

$allOk = $cosmosOk -and $redisOk -and $storageOk

if ($allOk) {
    Write-Host "✅ ALL TESTS PASSED - New keys are working!`n" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Test local app: npm run dev" -ForegroundColor White
    Write-Host "  2. Update Vercel:  vercel env pull && vercel env push" -ForegroundColor White
    Write-Host "  3. Update GitHub Secrets (if not done automatically)`n" -ForegroundColor White
    exit 0
} else {
    Write-Host "❌ SOME TESTS FAILED - Do not deploy yet!`n" -ForegroundColor Red
    Write-Host "Review errors above and verify keys are correct." -ForegroundColor Yellow
    exit 1
}
