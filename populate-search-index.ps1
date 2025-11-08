# Quick Start: Populate Azure Search Index
# This script runs the ingestion using environment variables from Vercel

Write-Host "=== Azure Search Index Population ===" -ForegroundColor Cyan
Write-Host ""

# Check if Python virtual environment exists
$venvPath = ".venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
    Write-Host "✓ Virtual environment created" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& "$venvPath\Scripts\Activate.ps1"
Write-Host "✓ Activated" -ForegroundColor Green
Write-Host ""

# Install required packages
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
pip install --quiet azure-storage-blob azure-search-documents azure-identity PyPDF2 python-docx openai
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Check if .env.production file exists in secrets folder
$secretsEnvPath = "C:\Users\sonal\secrets\benefitsaichatbot-383\.env.production"
if (Test-Path $secretsEnvPath) {
    Write-Host "✓ Found secrets file: $secretsEnvPath" -ForegroundColor Green
} else {
    Write-Host "⚠ Secrets file not found at: $secretsEnvPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Creating from Vercel environment..." -ForegroundColor Yellow
    
    # Create secrets directory if it doesn't exist
    $secretsDir = Split-Path $secretsEnvPath
    if (-not (Test-Path $secretsDir)) {
        New-Item -ItemType Directory -Path $secretsDir -Force | Out-Null
    }
    
    # Copy from Vercel env
    $vercelEnvPath = ".vercel\.env.production.local"
    if (Test-Path $vercelEnvPath) {
        Copy-Item $vercelEnvPath $secretsEnvPath
        Write-Host "✓ Created secrets file from Vercel env" -ForegroundColor Green
    } else {
        Write-Host "✗ ERROR: .vercel\.env.production.local not found" -ForegroundColor Red
        Write-Host ""
        Write-Host "Run: vercel env pull" -ForegroundColor Yellow
        exit 1
    }
}
Write-Host ""

# Run ingestion
Write-Host "Starting document ingestion..." -ForegroundColor Cyan
Write-Host "This may take 10-30 minutes depending on document count..." -ForegroundColor Gray
Write-Host ""

python ingest_real_documents_sdk.py

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Ingestion Complete ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Verify index has documents:" -ForegroundColor Gray
    Write-Host "   cd infra\azure; .\check-search-index.ps1" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "2. Test QA endpoint:" -ForegroundColor Gray
    Write-Host "   .\test-qa-local.ps1" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "3. Test production:" -ForegroundColor Gray
    Write-Host "   Visit https://benefitsaichatbot-2jcvb7ll0-melodie-s-projects.vercel.app" -ForegroundColor DarkGray
} else {
    Write-Host ""
    Write-Host "X Ingestion failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "- Check that Azure credentials in secrets file are correct" -ForegroundColor Gray
    Write-Host "- Verify documents exist in Azure Blob Storage documents container" -ForegroundColor Gray
    Write-Host "- Check Python dependencies are installed" -ForegroundColor Gray
    exit 1
}
