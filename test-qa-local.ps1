# Test QA endpoint locally with correct payload structure
# Usage: .\test-qa-local.ps1

Write-Host "=== Testing QA Endpoint Locally ===" -ForegroundColor Cyan
Write-Host ""

# 1. First verify config is correct
Write-Host "1. Checking config..." -ForegroundColor Yellow
try {
    $config = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/debug/config-check"
    Write-Host "   Embedding Deployment: $($config.openai.embeddingDeployment)" -ForegroundColor Green
    Write-Host "   Length: $($config.openai.embeddingDeploymentLength)" -ForegroundColor Green
    Write-Host "   Endpoint: $($config.openai.endpoint)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "   ERROR: Cannot reach dev server. Is npm run dev running?" -ForegroundColor Red
    Write-Host "   $_" -ForegroundColor Red
    exit 1
}

# 2. Test QA endpoint with proper payload
Write-Host "2. Testing QA endpoint with HSA question..." -ForegroundColor Yellow

$qaPayload = @{
    query = "Should I choose an HSA plan?"
    companyId = "amerivet"
    conversationId = "test-local-$(Get-Date -Format 'yyyyMMddHHmmss')"
    userId = "test-user"
} | ConvertTo-Json

Write-Host "   Payload:" -ForegroundColor Gray
Write-Host "   $qaPayload" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/qa" `
        -Method POST `
        -Body $qaPayload `
        -ContentType "application/json" `
        -TimeoutSec 30
    
    Write-Host "   SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Response ===" -ForegroundColor Cyan
    Write-Host "   Answer: $($response.answer)" -ForegroundColor White
    Write-Host ""
    Write-Host "   Metadata:" -ForegroundColor Gray
    Write-Host "   - Tier: $($response.metadata.tier)" -ForegroundColor Gray
    Write-Host "   - Grounding: $($response.metadata.groundingScore)" -ForegroundColor Gray
    Write-Host "   - Cache Hit: $($response.metadata.cacheHit)" -ForegroundColor Gray
    Write-Host "   - Response Time: $($response.metadata.responseTime)ms" -ForegroundColor Gray
    Write-Host "   - Sources: $($response.sources.Count)" -ForegroundColor Gray
    Write-Host ""
    
    if ($response.sources -and $response.sources.Count -gt 0) {
        Write-Host "   Top Sources:" -ForegroundColor Gray
        $response.sources | Select-Object -First 3 | ForEach-Object {
            Write-Host "   - $($_.title) (score: $($_.score))" -ForegroundColor DarkGray
        }
    }
    
} catch {
    Write-Host "   ERROR: QA request failed" -ForegroundColor Red
    Write-Host "   $_" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Response Body: $errorBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
