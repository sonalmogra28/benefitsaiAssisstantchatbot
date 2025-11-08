# Complete Fix for QA Assistant - Run this script
# This sets clean env vars and adds semantic configuration

Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host "  FIX QA ASSISTANT - Complete Setup" -ForegroundColor Cyan
Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host ""

# Step 1: Get Azure credentials
Write-Host "STEP 1: Set Azure Search Credentials" -ForegroundColor Yellow
Write-Host "-" -NoNewline; Write-Host ("-" * 59)
Write-Host ""

$serviceName = Read-Host "Enter Azure Search Service Name (e.g., 'amerivetsearch')"
$apiKey = Read-Host "Enter Azure Search Admin API Key" -AsSecureString
$apiKeyPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKey)
)

# Set environment variables (clean, no CRLF)
$env:AZURE_SEARCH_SERVICE_NAME = $serviceName.Trim()
$env:AZURE_SEARCH_API_KEY = $apiKeyPlain.Trim()
$env:AZURE_SEARCH_ENDPOINT = "https://$($serviceName.Trim()).search.windows.net"
$env:AZURE_SEARCH_INDEX = "chunks_prod_v1"
$env:AZURE_SEARCH_INDEX_NAME = "chunks_prod_v1"

Write-Host "OK Environment variables set (trimmed, no CRLF)" -ForegroundColor Green
Write-Host ""

# Step 2: Add semantic configuration
Write-Host "STEP 2: Add Semantic Configuration to Index" -ForegroundColor Yellow
Write-Host "-" -NoNewline; Write-Host ("-" * 59)
Write-Host ""

python add-semantic-config.py
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "X Failed to add semantic configuration" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual fix:" -ForegroundColor Yellow
    Write-Host "1. Go to Azure Portal - Search Service - Indexes - chunks_prod_v1"
    Write-Host "2. Click Semantic configurations tab"
    Write-Host "3. Add new configuration named default"
    Write-Host "4. Set title field: source"
    Write-Host "5. Set content fields: content"
    Write-Host "6. Set keyword fields: metadata"
    Write-Host "7. Save"
    exit 1
}

Write-Host ""
Write-Host "=" -ForegroundColor Green -NoNewline; Write-Host ("=" * 59) -ForegroundColor Green
Write-Host "  OK SEMANTIC CONFIGURATION ADDED!" -ForegroundColor Green
Write-Host "=" -ForegroundColor Green -NoNewline; Write-Host ("=" * 59) -ForegroundColor Green
Write-Host ""

# Step 3: Verify configuration
Write-Host "STEP 3: Verify Configuration" -ForegroundColor Yellow
Write-Host "-" -NoNewline; Write-Host ("-" * 59)
Write-Host ""
Write-Host "Run dev server and check config:" -ForegroundColor Gray
Write-Host "  1. npm run dev" -ForegroundColor DarkGray
Write-Host "  2. In another terminal:" -ForegroundColor DarkGray
Write-Host "     Invoke-RestMethod http://127.0.0.1:3000/api/debug/config-check" -ForegroundColor DarkGray
Write-Host ""

# Step 4: Next steps
Write-Host "STEP 4: Populate Index with Documents" -ForegroundColor Yellow
Write-Host "-" -NoNewline; Write-Host ("-" * 59)
Write-Host ""
Write-Host "Now you need to ingest documents. Run:" -ForegroundColor Gray
Write-Host "  python ingest_real_documents_sdk.py" -ForegroundColor DarkGray
Write-Host ""
Write-Host "This will:" -ForegroundColor Gray
Write-Host "  - Read PDFs from Azure Blob Storage" -ForegroundColor DarkGray
Write-Host "  - Chunk documents" -ForegroundColor DarkGray
Write-Host "  - Generate embeddings" -ForegroundColor DarkGray
Write-Host "  - Upload to chunks_prod_v1 index" -ForegroundColor DarkGray
Write-Host "  - Takes 10-30 minutes" -ForegroundColor DarkGray
Write-Host ""

Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host "  Setup Complete - Ready to Populate!" -ForegroundColor Cyan
Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 59) -ForegroundColor Cyan
