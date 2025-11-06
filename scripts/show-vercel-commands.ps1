# Manual Vercel Environment Update Commands
# Copy and paste these commands one at a time into your terminal
# The Vercel CLI will prompt you to paste each value

Write-Host "`n=== Vercel Production Environment Update Commands ===" -ForegroundColor Cyan
Write-Host "Copy and run each command below, then paste the value when prompted:`n" -ForegroundColor Yellow

$envFile = "C:\Users\sonal\secrets\benefitsaichatbot-383\.env.production"
$envVars = @{}

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#')) {
        if ($line -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $envVars[$key] = $value
        }
    }
}

$requiredKeys = @(
    'AZURE_COSMOS_ENDPOINT',
    'AZURE_COSMOS_KEY',
    'REDIS_URL',
    'RATE_LIMIT_REDIS_URL',
    'AZURE_STORAGE_CONNECTION_STRING',
    'AZURE_SEARCH_ENDPOINT',
    'AZURE_SEARCH_API_KEY',
    'AZURE_SEARCH_INDEX_NAME',
    'AZURE_SEARCH_VECTOR_FIELD',
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_API_VERSION',
    'AZURE_OPENAI_EMBEDDING_DEPLOYMENT',
    'AZURE_OPENAI_DEPLOYMENT_L1',
    'AZURE_OPENAI_DEPLOYMENT_L2',
    'AZURE_OPENAI_DEPLOYMENT_L3',
    'NODE_ENV',
    'LOG_LEVEL',
    'NEXT_PUBLIC_ENVIRONMENT',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'DOMAIN_ROOT'
)

foreach ($key in $requiredKeys) {
    if ($envVars.ContainsKey($key)) {
        $value = $envVars[$key]
        Write-Host "# $key" -ForegroundColor Cyan
        Write-Host "vercel env rm $key production" -ForegroundColor Gray
        Write-Host "echo `"$value`" | vercel env add $key production`n" -ForegroundColor White
    }
}

Write-Host "`n=== OR: Use Vercel Dashboard (Recommended) ===" -ForegroundColor Green
Write-Host "1. Go to: https://vercel.com/melodie-s-projects/benefitsaichatbot-sm/settings/environment-variables" -ForegroundColor Yellow
Write-Host "2. Add/Update each variable with values from:`n   C:\Users\sonal\secrets\benefitsaichatbot-383\.env.production`n" -ForegroundColor Yellow
