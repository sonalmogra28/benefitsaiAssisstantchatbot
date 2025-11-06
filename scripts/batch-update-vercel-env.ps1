# Batch Update Vercel Environment Variables Without Trailing Newlines
# Uses Vercel CLI properly to avoid newline issues

$varsToUpdate = @{
    "AZURE_OPENAI_ENDPOINT" = "https://amerivetopenai.openai.azure.com"
    "AZURE_OPENAI_API_VERSION" = "2024-02-15-preview"
    "AZURE_OPENAI_EMBEDDING_DEPLOYMENT" = "text-embedding-3-large"
    "AZURE_OPENAI_DEPLOYMENT_L1" = "gpt-4o-mini"
    "AZURE_OPENAI_DEPLOYMENT_L2" = "gpt-4o-mini"
    "AZURE_OPENAI_DEPLOYMENT_L3" = "gpt-4o-mini"
    "AZURE_SEARCH_ENDPOINT" = "https://amerivetsearch.search.windows.net"
    "AZURE_SEARCH_INDEX_NAME" = "chunks_prod_v1"
}

Write-Host "=== Batch Updating Vercel Environment Variables ===" -ForegroundColor Cyan
Write-Host "Project: benefitsaichatbot-sm" -ForegroundColor Gray
Write-Host "Environment: production`n" -ForegroundColor Gray

foreach ($varName in $varsToUpdate.Keys) {
    $value = $varsToUpdate[$varName]
    
    Write-Host "Processing: $varName" -ForegroundColor Yellow
    Write-Host "  Value: $value" -ForegroundColor Gray
    
    # Remove existing
    Write-Host "  Removing..." -ForegroundColor Gray
    $null = echo "y" | vercel env rm $varName production 2>&1
    
    # Add with clean value using here-string
    Write-Host "  Adding..." -ForegroundColor Gray
    $result = @"
$value
"@ | vercel env add $varName production 2>&1
    
    if ($result -match "Added") {
        Write-Host "  ✅ Updated" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Check result: $result" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

Write-Host "✅ All variables updated!" -ForegroundColor Green
Write-Host "`nNext: Deploy and verify" -ForegroundColor Cyan
Write-Host "  vercel --prod --force" -ForegroundColor White
Write-Host "  Invoke-RestMethod -Uri 'https://amerivetaibot.bcgenrolls.com/api/debug/config' | ConvertTo-Json" -ForegroundColor White
