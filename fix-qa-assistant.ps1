# ONE COMMAND FIX: Populate Azure Search and Fix QA Assistant
# This script does everything needed to fix the fallback message issue

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  FIX QA ASSISTANT - Complete Setup & Population           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Step 1: Get Azure credentials
Write-Host "STEP 1: Azure Credentials" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

$searchService = Read-Host "Enter Azure Search Service Name (e.g., 'amerivetasschatbotsearch')"
$searchKey = Read-Host "Enter Azure Search API Key (Admin Key from Azure Portal)" -AsSecureString
$searchKeyPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($searchKey)
)

$env:AZURE_SEARCH_SERVICE_NAME = $searchService
$env:AZURE_SEARCH_API_KEY = $searchKeyPlain

Write-Host "✓ Credentials set" -ForegroundColor Green
Write-Host ""

# Step 2: Diagnose current state
Write-Host "STEP 2: Diagnose Current State" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

cd infra\azure
.\check-search-index.ps1
$diagnosisExitCode = $LASTEXITCODE

if ($diagnosisExitCode -ne 0) {
    Write-Host ""
    Write-Host "⚠ Issues detected. Proceeding with fixes..." -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Update index with semantic configuration
Write-Host "STEP 3: Update Index Schema" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

.\update-search-index.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to update index schema" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Populate documents
Write-Host "STEP 4: Populate Documents" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "⚠ This will take 10-30 minutes..." -ForegroundColor Yellow
Write-Host ""

cd ..\..
.\populate-search-index.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to populate documents" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Verify everything worked
Write-Host "STEP 5: Final Verification" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

cd infra\azure
.\check-search-index.ps1
Write-Host ""

# Step 6: Test QA
Write-Host "STEP 6: Test QA Endpoint" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

cd ..\..

# Check if dev server is running
$devServerRunning = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -like "*Next.js*"
}

if (-not $devServerRunning) {
    Write-Host "⚠ Dev server not running. Start it with: npm run dev" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "Testing local QA endpoint..." -ForegroundColor Gray
    .\test-qa-local.ps1
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✓ SETUP COMPLETE!                                         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Production site should now work:" -ForegroundColor Cyan
Write-Host "https://benefitsaichatbot-2jcvb7ll0-melodie-s-projects.vercel.app" -ForegroundColor White
Write-Host ""
Write-Host "Test queries:" -ForegroundColor Yellow
Write-Host "• 'What dental and vision benefits are available?'" -ForegroundColor Gray
Write-Host "• 'Should I choose an HSA plan?'" -ForegroundColor Gray
Write-Host "• 'How much is the company contribution for health insurance?'" -ForegroundColor Gray
Write-Host ""
