# Clean Vercel Environment Variables
# This script removes and recreates env vars to eliminate CRLF characters

Write-Host "=== Clean Vercel Environment Variables ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will clean CRLF characters from Vercel env vars" -ForegroundColor Yellow
Write-Host "by deleting and recreating them with trimmed values." -ForegroundColor Yellow
Write-Host ""

# Variables to clean
$varsToClean = @(
    @{
        Name = "AZURE_SEARCH_INDEX"
        Value = "chunks_prod_v1"
        Description = "Azure Search index name for RAG"
    },
    @{
        Name = "AZURE_SEARCH_INDEX_NAME"
        Value = "chunks_prod_v1"
        Description = "Azure Search index name (legacy var)"
    },
    @{
        Name = "AZURE_OPENAI_EMBEDDING_DEPLOYMENT"
        Value = "text-embedding-3-large"
        Description = "Azure OpenAI embedding deployment name"
    },
    @{
        Name = "AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT"
        Value = "text-embedding-3-large"
        Description = "Azure OpenAI embedding deployment name (plural)"
    }
)

Write-Host "Variables to clean:" -ForegroundColor Yellow
foreach ($var in $varsToClean) {
    Write-Host "  - $($var.Name) = '$($var.Value)'" -ForegroundColor Gray
}
Write-Host ""

$confirm = Read-Host "Proceed? This will update production env vars (y/n)"
if ($confirm -ne 'y') {
    Write-Host "Aborted" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "Cleaning environment variables..." -ForegroundColor Yellow
Write-Host ""

foreach ($var in $varsToClean) {
    Write-Host "Processing $($var.Name)..." -ForegroundColor Gray
    
    # Remove existing variable
    Write-Host "  Removing old value..." -ForegroundColor DarkGray
    & vercel env rm $var.Name production --yes 2>&1 | Out-Null
    
    # Add clean value
    Write-Host "  Adding clean value: '$($var.Value)'" -ForegroundColor DarkGray
    $var.Value | vercel env add $var.Name production 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ $($var.Name) cleaned" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed to clean $($var.Name)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Cleaning Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Redeploy to apply changes:" -ForegroundColor Gray
Write-Host "   vercel --prod" -ForegroundColor DarkGray
Write-Host ""
Write-Host "2. Verify config is clean:" -ForegroundColor Gray
Write-Host "   curl https://your-site.vercel.app/api/debug/config-check" -ForegroundColor DarkGray
Write-Host ""
Write-Host "3. Update Azure Search index:" -ForegroundColor Gray
Write-Host "   cd infra\azure; .\update-search-index.ps1" -ForegroundColor DarkGray
Write-Host ""
Write-Host "4. Populate documents:" -ForegroundColor Gray
Write-Host "   cd ..\\..; .\populate-search-index.ps1" -ForegroundColor DarkGray
Write-Host ""
