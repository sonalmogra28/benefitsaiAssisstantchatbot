# Set Clean Environment Variables (No CRLF)
# Run this before starting dev server

Write-Host "Setting clean Azure environment variables..." -ForegroundColor Cyan

# Azure Search
$env:AZURE_SEARCH_ENDPOINT = "https://amerivetsearch.search.windows.net"
$env:AZURE_SEARCH_API_KEY = Read-Host "Enter Azure Search Admin API Key"
$env:AZURE_SEARCH_INDEX = "chunks_prod_v1"
$env:AZURE_SEARCH_INDEX_NAME = "chunks_prod_v1"

# Azure OpenAI
$env:AZURE_OPENAI_ENDPOINT = "https://amerivetopenai.openai.azure.com"
$env:AZURE_OPENAI_API_KEY = Read-Host "Enter Azure OpenAI API Key"
$env:AZURE_OPENAI_API_VERSION = "2024-02-01"
$env:AZURE_OPENAI_EMBEDDING_DEPLOYMENT = "text-embedding-3-large"
$env:AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT = "text-embedding-3-large"
$env:AZURE_OPENAI_DEPLOYMENT_NAME = "gpt-4o"

Write-Host ""
Write-Host "Environment variables set successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Values set:" -ForegroundColor Yellow
Write-Host "  AZURE_SEARCH_INDEX: $env:AZURE_SEARCH_INDEX" -ForegroundColor Gray
Write-Host "  AZURE_OPENAI_EMBEDDING_DEPLOYMENT: $env:AZURE_OPENAI_EMBEDDING_DEPLOYMENT" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm run dev" -ForegroundColor White
Write-Host "2. In another terminal, verify: Invoke-RestMethod http://127.0.0.1:3000/api/debug/config-check | ConvertTo-Json" -ForegroundColor White
