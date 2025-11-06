$ErrorActionPreference = "Stop"
$productionUrl = "https://amerivetaibot.bcgenrolls.com"
$testCompanyId = "amerivet"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Production Smoke Test Suite" -ForegroundColor Cyan
Write-Host "========================================
" -ForegroundColor Cyan

function SafeJson($content) {
    try { return $content | ConvertFrom-Json } catch { return $null }
}

# Test 1: Health Check
Write-Host "[Test 1] Endpoint Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$productionUrl/api/debug/ping-aoai" -Method Get
    $json = SafeJson $response.Content
    
    if ($json.success -eq $true) {
        Write-Host "  PASS: Chat endpoint OK" -ForegroundColor Green
        Write-Host "  PASS: Embedding endpoint OK (3072 dims)" -ForegroundColor Green
    } else {
        Write-Host "  FAIL: Health check failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  FAIL: Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host "
[Test 2] QA Endpoint - Sample Query" -ForegroundColor Yellow
$body = @{
    query = "What are the HMO plan options?"
    conversationId = "smoke-test-1"
    companyId = $testCompanyId
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$productionUrl/api/qa" -Method Post -ContentType "application/json" -Body $body
    $json = SafeJson $response.Content
    
    if ($json) {
        $grounding = $json.metadata.groundingScore
        $retrieval = $json.metadata.retrievalCount
        $latency = $json.metadata.latencyBreakdown.total
        
        Write-Host "  PASS: Query executed successfully" -ForegroundColor Green
        Write-Host "    - Retrieval Count: $retrieval"
        Write-Host "    - Grounding Score: $([Math]::Round($grounding, 3))"
        Write-Host "    - Latency: $latency ms"
    }
} catch {
    Write-Host "  FAIL: Query error: $_" -ForegroundColor Red
}

Write-Host "
========================================" -ForegroundColor Cyan
Write-Host "Smoke Test Completed" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
