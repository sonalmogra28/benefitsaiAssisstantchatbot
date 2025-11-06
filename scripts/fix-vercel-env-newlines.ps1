# Fix Vercel Environment Variables with Trailing Newlines
# This script removes and re-adds env vars with proper trimming

$envFile = "C:\Users\sonal\secrets\benefitsaichatbot-383\.env.production"

# Critical vars with newline issues
$varsToFix = @(
    "AZURE_OPENAI_ENDPOINT",
    "AZURE_OPENAI_API_VERSION",
    "AZURE_OPENAI_EMBEDDING_DEPLOYMENT",
    "AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT",
    "AZURE_OPENAI_DEPLOYMENT_L1",
    "AZURE_OPENAI_DEPLOYMENT_L2",
    "AZURE_OPENAI_DEPLOYMENT_L3",
    "AZURE_SEARCH_ENDPOINT",
    "AZURE_SEARCH_INDEX_NAME"
)

Write-Host "Reading from: $envFile" -ForegroundColor Cyan

foreach ($varName in $varsToFix) {
    # Read value from file (handle leading spaces)
    $line = Get-Content $envFile | Where-Object { $_.Trim() -match "^$varName=" }
    if ($line) {
        $value = ($line.Trim() -replace "^$varName=", "").Trim()
        
        Write-Host "`nProcessing: $varName" -ForegroundColor Yellow
        Write-Host "  Value: '$value'" -ForegroundColor Gray
        
        # Remove existing (suppress confirmation)
        Write-Host "  Removing old value..." -ForegroundColor Gray
        echo "y" | vercel env rm $varName production 2>&1 | Out-Null
        
        # Add with trimmed value
        Write-Host "  Adding trimmed value..." -ForegroundColor Gray
        $output = echo $value | vercel env add $varName production 2>&1
        
        if ($output -match "Added|Created") {
            Write-Host "  ✅ Fixed: $varName" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Check: $varName" -ForegroundColor Yellow
        }
    } else {
        Write-Host "`n❌ Not found in file: $varName" -ForegroundColor Red
    }
}

Write-Host "`n✅ Environment variable cleanup complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run: vercel --prod --force" -ForegroundColor White
Write-Host "  2. Test: Invoke-RestMethod -Uri 'https://amerivetaibot.bcgenrolls.com/api/debug/config'" -ForegroundColor White
