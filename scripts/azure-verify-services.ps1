# ============================================================================
# Azure Services Verification Script
# Bootstrap Step 3: Verify all Azure service endpoints respond
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$EnvFile = ".env.local"
)

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Azure Services Verification" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Load .env.local
if (-not (Test-Path $EnvFile)) {
    Write-Host "ERROR: $EnvFile not found" -ForegroundColor Red
    Write-Host "Run: .\scripts\azure-regenerate-keys.ps1 first" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/5] Loading environment variables from $EnvFile..." -ForegroundColor Cyan
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"')
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}
Write-Host "  ✓ Environment loaded" -ForegroundColor Green
Write-Host ""

# Test Cosmos DB
Write-Host "[2/5] Testing Cosmos DB connection..." -ForegroundColor Cyan
$cosmosEndpoint = $env:AZURE_COSMOS_ENDPOINT
if ($cosmosEndpoint) {
    try {
        $response = Invoke-WebRequest -Uri $cosmosEndpoint -Method GET -UseBasicParsing -ErrorAction Stop
        Write-Host "  ✓ Cosmos DB endpoint reachable" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Cosmos DB endpoint unreachable: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠ AZURE_COSMOS_ENDPOINT not set" -ForegroundColor Yellow
}
Write-Host ""

# Test Redis Cache
Write-Host "[3/5] Testing Redis Cache connection..." -ForegroundColor Cyan
$redisUrl = $env:REDIS_URL
if ($redisUrl) {
    if ($redisUrl -match 'rediss://:[^@]+@([^:]+):(\d+)') {
        $redisHost = $matches[1]
        $redisPort = $matches[2]
        Write-Host "  Redis Host: $redisHost" -ForegroundColor White
        Write-Host "  Redis Port: $redisPort" -ForegroundColor White
        
        # Test TCP connection
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $tcpClient.Connect($redisHost, $redisPort)
            $tcpClient.Close()
            Write-Host "  ✓ Redis Cache port reachable" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Redis Cache port unreachable: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⚠ Invalid REDIS_URL format" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠ REDIS_URL not set" -ForegroundColor Yellow
}
Write-Host ""

# Test Azure Search
Write-Host "[4/5] Testing Azure Search endpoint..." -ForegroundColor Cyan
$searchEndpoint = $env:AZURE_SEARCH_ENDPOINT
$searchKey = $env:AZURE_SEARCH_KEY
if ($searchEndpoint -and $searchKey) {
    try {
        $headers = @{
            "api-key" = $searchKey
        }
        $testUrl = "$searchEndpoint/indexes?api-version=2024-07-01"
        $response = Invoke-RestMethod -Uri $testUrl -Headers $headers -Method GET -ErrorAction Stop
        Write-Host "  ✓ Azure Search endpoint reachable" -ForegroundColor Green
        Write-Host "  Indexes found: $($response.value.Count)" -ForegroundColor White
    } catch {
        Write-Host "  ✗ Azure Search endpoint failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠ AZURE_SEARCH_ENDPOINT or AZURE_SEARCH_KEY not set" -ForegroundColor Yellow
}
Write-Host ""

# Test Storage Account
Write-Host "[5/5] Testing Storage Account..." -ForegroundColor Cyan
$storageAccountName = $env:AZURE_STORAGE_ACCOUNT_NAME
if ($storageAccountName) {
    $blobEndpoint = "https://$storageAccountName.blob.core.windows.net"
    try {
        $response = Invoke-WebRequest -Uri $blobEndpoint -Method GET -UseBasicParsing -ErrorAction Stop
        Write-Host "  ✓ Storage Account blob endpoint reachable" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode -eq 400) {
            Write-Host "  ✓ Storage Account exists (auth required)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Storage Account unreachable: $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  ⚠ AZURE_STORAGE_ACCOUNT_NAME not set" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Verification Complete" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: Start dev server and test runtime" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
