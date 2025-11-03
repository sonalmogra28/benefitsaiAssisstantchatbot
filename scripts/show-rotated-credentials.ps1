# Extract Rotated Credentials for Vercel/GitHub Update
# Run this script to get the values to paste into Vercel/GitHub

$envPath = "$env:USERPROFILE\secrets\benefitsaichatbot-383\.env.production"

if (-not (Test-Path $envPath)) {
    Write-Host "❌ .env.production not found at: $envPath" -ForegroundColor Red
    exit 1
}

Write-Host "`n=============================================================`n  ROTATED CREDENTIALS FOR VERCEL/GITHUB UPDATE`n=============================================================`n" -ForegroundColor Cyan

$content = Get-Content $envPath -Raw

# Extract values
$cosmosConnString = ($content | Select-String "AZURE_COSMOS_CONNECTION_STRING=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value }).Trim()
$storageConnString = ($content | Select-String "AZURE_STORAGE_CONNECTION_STRING=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value }).Trim()
# Read line by line to avoid regex issues
$lines = Get-Content $envPath
$redisUrl = ($lines | Where-Object { $_ -match '^REDIS_URL=' } | ForEach-Object { $_ -replace '^REDIS_URL=', '' } | Select-Object -First 1).Trim()
$rateLimitRedisUrl = ($lines | Where-Object { $_ -match '^RATE_LIMIT_REDIS_URL=' } | ForEach-Object { $_ -replace '^RATE_LIMIT_REDIS_URL=', '' } | Select-Object -First 1).Trim()

Write-Host "Copy these values to Vercel (Production environment):`n" -ForegroundColor Yellow

Write-Host "1. AZURE_COSMOS_CONNECTION_STRING" -ForegroundColor Cyan
Write-Host "   $cosmosConnString`n" -ForegroundColor White

Write-Host "2. AZURE_STORAGE_CONNECTION_STRING" -ForegroundColor Cyan
Write-Host "   $storageConnString`n" -ForegroundColor White

Write-Host "3. REDIS_URL" -ForegroundColor Cyan
Write-Host "   $redisUrl`n" -ForegroundColor White

Write-Host "4. RATE_LIMIT_REDIS_URL" -ForegroundColor Cyan
Write-Host "   $rateLimitRedisUrl`n" -ForegroundColor White

Write-Host "=============================================================`n" -ForegroundColor Cyan
Write-Host "VERCEL UPDATE OPTIONS:`n" -ForegroundColor Yellow

Write-Host "Option A - Vercel Dashboard (Manual):" -ForegroundColor White
Write-Host "  1. Go to: https://vercel.com/dashboard" -ForegroundColor Gray
Write-Host "  2. Select your project" -ForegroundColor Gray
Write-Host "  3. Settings → Environment Variables" -ForegroundColor Gray
Write-Host "  4. Update each variable above (Production scope)" -ForegroundColor Gray
Write-Host "  5. Redeploy: vercel --prod`n" -ForegroundColor Gray

Write-Host "Option B - Vercel CLI (Semi-automated):" -ForegroundColor White
Write-Host "  Copy-paste each value when prompted:`n" -ForegroundColor Gray

Write-Host '  vercel env rm AZURE_COSMOS_CONNECTION_STRING production' -ForegroundColor Gray
Write-Host '  vercel env add AZURE_COSMOS_CONNECTION_STRING production' -ForegroundColor Gray
Write-Host '  # Paste value from above when prompted' -ForegroundColor DarkGray
Write-Host ''
Write-Host '  vercel env rm AZURE_STORAGE_CONNECTION_STRING production' -ForegroundColor Gray
Write-Host '  vercel env add AZURE_STORAGE_CONNECTION_STRING production' -ForegroundColor Gray
Write-Host ''
Write-Host '  vercel env rm REDIS_URL production' -ForegroundColor Gray
Write-Host '  vercel env add REDIS_URL production' -ForegroundColor Gray
Write-Host ''
Write-Host '  vercel env rm RATE_LIMIT_REDIS_URL production' -ForegroundColor Gray
Write-Host '  vercel env add RATE_LIMIT_REDIS_URL production' -ForegroundColor Gray
Write-Host ''

Write-Host "=============================================================`n" -ForegroundColor Cyan
Write-Host "GITHUB SECRETS UPDATE:`n" -ForegroundColor Yellow

Write-Host "Go to: https://github.com/sonalmogra28/benefitsaiAssisstantchatbot/settings/secrets/actions`n" -ForegroundColor White
Write-Host "Update these 4 repository secrets with values above:" -ForegroundColor Gray
Write-Host "  - AZURE_COSMOS_CONNECTION_STRING" -ForegroundColor Cyan
Write-Host "  - AZURE_STORAGE_CONNECTION_STRING" -ForegroundColor Cyan
Write-Host "  - REDIS_URL" -ForegroundColor Cyan
Write-Host "  - RATE_LIMIT_REDIS_URL`n" -ForegroundColor Cyan

Write-Host "=============================================================`n" -ForegroundColor Cyan
Write-Host "⚠️  AFTER updating Vercel + GitHub:" -ForegroundColor Yellow
Write-Host "  1. Deploy to production: vercel --prod" -ForegroundColor White
Write-Host "  2. Test production: curl https://your-domain.vercel.app/api/health" -ForegroundColor White
Write-Host "  3. Verify no auth errors in Vercel logs`n" -ForegroundColor White
