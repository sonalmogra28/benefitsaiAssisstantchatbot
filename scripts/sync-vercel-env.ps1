# Sync Vercel Production Environment from Secure .env.production
# Reads values from secure file and updates Vercel non-interactively

param(
    [string]$EnvFile = "$env:USERPROFILE\secrets\benefitsaichatbot-383\.env.production"
)

$ErrorActionPreference = "Stop"

function Log($msg, $color="White") { Write-Host $msg -ForegroundColor $color }

Log "`n=== Syncing Vercel Production Environment ===" "Cyan"

# Check if env file exists
if (-not (Test-Path $EnvFile)) {
    Log "❌ Env file not found: $EnvFile" "Red"
    exit 1
}

Log "Reading from: $EnvFile" "Yellow"

# Parse .env file
$envVars = @{}
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    # Skip comments and empty lines
    if ($line -and -not $line.StartsWith('#')) {
        if ($line -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $envVars[$key] = $value
        }
    }
}

Log "Found $($envVars.Count) environment variables`n" "Green"

# Required keys for production
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

# Check for missing keys
$missing = $requiredKeys | Where-Object { -not $envVars.ContainsKey($_) }
if ($missing) {
    Log "❌ Missing required keys:" "Red"
    $missing | ForEach-Object { Log "  - $_" "Yellow" }
    exit 1
}

Log "✅ All required keys present`n" "Green"

# Sync to Vercel (non-interactive via cmd /c echo)
Log "Syncing to Vercel production..." "Cyan"

$syncedCount = 0
$failedCount = 0

foreach ($key in $requiredKeys) {
    $value = $envVars[$key]
    
    # Sanitize value (trim, remove CR/LF)
    $value = $value.Trim() -replace "`r", "" -replace "`n", ""
    
    try {
        # Use echo to pipe value (Vercel CLI doesn't support --yes, will auto-overwrite)
        $escapedValue = $value -replace '"', '`"'
        $output = echo $escapedValue | vercel env add $key production 2>&1
        
        if ($LASTEXITCODE -eq 0 -or $output -like "*already exists*" -or $output -like "*Updated*" -or $output -like "*Added*" -or $output -like "*Environment Variable*") {
            Log "✅ $key" "Green"
            $syncedCount++
        } else {
            Log "⚠️  $key (output: $output)" "Yellow"
            $failedCount++
        }
    } catch {
        Log "❌ $key failed: $_" "Red"
        $failedCount++
    }
}

Log "`n=== Sync Complete ===" "Green"
Log "✅ Synced: $syncedCount" "Green"
if ($failedCount -gt 0) {
    Log "❌ Failed: $failedCount" "Red"
}

Log "`n=== Next Steps ===" "Yellow"
Log "1. Verify envs: vercel env ls production" "White"
Log "2. Clean install: npm ci" "White"
Log "3. Build: npm run build" "White"
Log "4. Deploy: vercel --prod --force`n" "White"
