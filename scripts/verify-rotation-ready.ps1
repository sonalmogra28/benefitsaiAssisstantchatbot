# Pre-Rotation Verification Script
# Performs all sanity checks before key rotation

Write-Host "`n=============================================================" -ForegroundColor Cyan
Write-Host "  PRE-ROTATION VERIFICATION CHECKLIST" -ForegroundColor Cyan
Write-Host "=============================================================`n" -ForegroundColor Cyan

$checks = @()

# Check 1: .env.production is untracked
Write-Host "[1/6] Verifying .env.production is untracked..." -ForegroundColor Yellow
$envCheck = git check-ignore .env.production 2>&1
if ($envCheck -match "\.env\.production") {
    Write-Host "  ✅ .env.production is ignored" -ForegroundColor Green
    $checks += $true
} else {
    Write-Host "  ❌ FAIL: .env.production is NOT ignored!" -ForegroundColor Red
    Write-Host "     Run: echo '.env*' >> .gitignore" -ForegroundColor Yellow
    $checks += $false
}

# Check 2: Rotation scripts are ignored
Write-Host "`n[2/6] Verifying rotation scripts are untracked..." -ForegroundColor Yellow
$scriptCheck1 = git check-ignore scripts/rotate-keys-NOW.ps1 2>&1
$scriptCheck2 = git check-ignore scripts/rotate-azure-keys.ps1 2>&1

if (($scriptCheck1 -match "rotate-keys-NOW") -and ($scriptCheck2 -match "rotate-azure-keys")) {
    Write-Host "  ✅ Both rotation scripts are ignored" -ForegroundColor Green
    $checks += $true
} else {
    Write-Host "  ❌ FAIL: Rotation scripts NOT ignored!" -ForegroundColor Red
    Write-Host "     Add to .gitignore:" -ForegroundColor Yellow
    Write-Host "       scripts/rotate-azure-keys.ps1" -ForegroundColor Yellow
    Write-Host "       scripts/rotate-keys-NOW.ps1" -ForegroundColor Yellow
    $checks += $false
}

# Check 3: Azure CLI authenticated
Write-Host "`n[3/6] Verifying Azure CLI authentication..." -ForegroundColor Yellow
try {
    $account = az account show 2>$null | ConvertFrom-Json
    if ($account.user.name) {
        Write-Host "  ✅ Authenticated as: $($account.user.name)" -ForegroundColor Green
        Write-Host "     Subscription: $($account.name)" -ForegroundColor Gray
        $checks += $true
    } else {
        throw "No user found"
    }
} catch {
    Write-Host "  ❌ FAIL: Not authenticated to Azure CLI" -ForegroundColor Red
    Write-Host "     Run: az login" -ForegroundColor Yellow
    $checks += $false
}

# Check 4: Azure resource names verification
Write-Host "`n[4/6] Verifying Azure resource names..." -ForegroundColor Yellow
$resourceGroup = "benefits-chatbot-project"
$cosmosAccount = "benefits-chatbot-cosmos-dev"
$redisName = "benefits-chatbot-redis-dev"
$storageAccount = "benefitschatbotdev"

$resourcesValid = $true

# Check Cosmos DB
$cosmosExists = az cosmosdb show --name $cosmosAccount --resource-group $resourceGroup --query "name" -o tsv 2>$null
if ($cosmosExists -eq $cosmosAccount) {
    Write-Host "  ✅ Cosmos DB: $cosmosAccount" -ForegroundColor Green
} else {
    Write-Host "  ❌ Cosmos DB NOT FOUND: $cosmosAccount" -ForegroundColor Red
    $resourcesValid = $false
}

# Check Redis
$redisExists = az redis show --name $redisName --resource-group $resourceGroup --query "name" -o tsv 2>$null
if ($redisExists -eq $redisName) {
    Write-Host "  ✅ Redis Cache: $redisName" -ForegroundColor Green
} else {
    Write-Host "  ❌ Redis Cache NOT FOUND: $redisName" -ForegroundColor Red
    $resourcesValid = $false
}

# Check Storage
$storageExists = az storage account show --name $storageAccount --resource-group $resourceGroup --query "name" -o tsv 2>$null
if ($storageExists -eq $storageAccount) {
    Write-Host "  ✅ Storage Account: $storageAccount" -ForegroundColor Green
} else {
    Write-Host "  ❌ Storage Account NOT FOUND: $storageAccount" -ForegroundColor Red
    $resourcesValid = $false
}

$checks += $resourcesValid

# Check 5: Secrets directory exists
Write-Host "`n[5/6] Verifying secrets storage location..." -ForegroundColor Yellow
$secretsDir = "$env:USERPROFILE\secrets\benefitsaichatbot-383"
if (Test-Path $secretsDir) {
    Write-Host "  ✅ Secrets directory exists: $secretsDir" -ForegroundColor Green
    $checks += $true
} else {
    Write-Host "  ⚠️  Creating secrets directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $secretsDir -Force | Out-Null
    Write-Host "  ✅ Created: $secretsDir" -ForegroundColor Green
    $checks += $true
}

# Check 6: GitHub CLI (optional for -UpdateGitHub)
Write-Host "`n[6/6] Verifying GitHub CLI (optional)..." -ForegroundColor Yellow
try {
    $ghVersion = gh --version 2>$null
    if ($ghVersion) {
        Write-Host "  ✅ GitHub CLI installed" -ForegroundColor Green
        Write-Host "     Rotation will update GitHub Secrets automatically" -ForegroundColor Gray
        $checks += $true
    } else {
        throw "Not found"
    }
} catch {
    Write-Host "  ⚠️  GitHub CLI not found (optional)" -ForegroundColor Yellow
    Write-Host "     You'll need to update GitHub Secrets manually" -ForegroundColor Gray
    Write-Host "     Install: winget install GitHub.cli" -ForegroundColor Gray
    $checks += $true  # Not critical
}

# Summary
Write-Host "`n=============================================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "=============================================================`n" -ForegroundColor Cyan

$passCount = ($checks | Where-Object { $_ -eq $true }).Count
$totalChecks = $checks.Count

Write-Host "Checks Passed: $passCount / $totalChecks" -ForegroundColor $(if ($passCount -eq $totalChecks) { "Green" } else { "Yellow" })

if ($passCount -eq $totalChecks) {
    Write-Host "`n✅ ALL CHECKS PASSED - READY FOR ROTATION`n" -ForegroundColor Green
    Write-Host "Next step: Run rotation script" -ForegroundColor Cyan
    Write-Host "  .\scripts\rotate-keys-NOW.ps1`n" -ForegroundColor White
    exit 0
} else {
    Write-Host "`n❌ SOME CHECKS FAILED - DO NOT ROTATE YET`n" -ForegroundColor Red
    Write-Host "Fix the issues above before proceeding." -ForegroundColor Yellow
    exit 1
}
