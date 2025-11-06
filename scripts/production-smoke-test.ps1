# Final Production Smoke Test
# Tests health and RAG endpoints after deployment fixes

Write-Host "`n=== Production Smoke Test ===" -ForegroundColor Cyan
Write-Host "Testing: https://amerivetaibot.bcgenrolls.com`n" -ForegroundColor Yellow

# Test 1: Health Check
Write-Host "[Test 1] Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -UseBasicParsing -Uri "https://amerivetaibot.bcgenrolls.com/api/health" -TimeoutSec 10
    if ($health.StatusCode -eq 200) {
        Write-Host "✅ Health: $($health.Content)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}

# Test 2: RAG Q&A
Write-Host "`n[Test 2] RAG Q&A Endpoint..." -ForegroundColor Yellow
$body = @{
    query = "What are the dental benefits?"
    companyId = "amerivet"
} | ConvertTo-Json

try {
    $startTime = Get-Date
    $qa = Invoke-RestMethod -Uri "https://amerivetaibot.bcgenrolls.com/api/qa" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 45
    $elapsed = ((Get-Date) - $startTime).TotalSeconds

    Write-Host "✅ Response received in $([Math]::Round($elapsed, 2))s" -ForegroundColor Green
    
    # Check for demo mode
    $isDemo = $qa.answer -like "*demo environment*"
    
    if ($isDemo) {
        Write-Host "`n⚠️  DEMO MODE DETECTED" -ForegroundColor Red
        Write-Host "Answer contains: 'demo environment without connected search'" -ForegroundColor Yellow
        Write-Host "`nPossible causes:" -ForegroundColor Cyan
        Write-Host "  1. Azure OpenAI deployments not ready yet (wait 2-3 minutes)" -ForegroundColor White
        Write-Host "  2. Environment variables not propagated to new deployment" -ForegroundColor White
        Write-Host "  3. Hybrid retrieval throwing error (check Vercel logs)" -ForegroundColor White
    } else {
        Write-Host "`n✅ RAG PIPELINE WORKING!" -ForegroundColor Green
        Write-Host "Real content returned (not demo fallback)" -ForegroundColor Green
    }
    
    Write-Host "`nResponse Details:" -ForegroundColor Cyan
    Write-Host "  Tier: $($qa.metadata.tier)" -ForegroundColor White
    Write-Host "  Response Time: $($qa.metadata.responseTime)ms" -ForegroundColor White
    Write-Host "  Sources Count: $($qa.sources.Count)" -ForegroundColor White
    Write-Host "  Confidence: $($qa.confidence)" -ForegroundColor White
    
    $answerPreview = $qa.answer.Substring(0, [Math]::Min(250, $qa.answer.Length))
    Write-Host "`nAnswer Preview:" -ForegroundColor Cyan
    Write-Host "  $answerPreview..." -ForegroundColor White
    
    if ($qa.sources -and $qa.sources.Count -gt 0) {
        Write-Host "`nTop Source:" -ForegroundColor Cyan
        Write-Host "  Title: $($qa.sources[0].title)" -ForegroundColor White
        Write-Host "  Section: $($qa.sources[0].section)" -ForegroundColor White
    }

} catch {
    Write-Host "❌ QA endpoint failed: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host "If demo mode persists:" -ForegroundColor Yellow
Write-Host "  1. Wait 2-3 minutes for Azure OpenAI deployments to provision" -ForegroundColor White
Write-Host "  2. Check: az cognitiveservices account deployment list -g benefits-chatbot-project -n amerivetopenai -o table" -ForegroundColor White
Write-Host "  3. Verify deployments show 'Succeeded' status" -ForegroundColor White
Write-Host "  4. Check Vercel logs: vercel logs https://amerivetaibot.bcgenrolls.com --since=5m`n" -ForegroundColor White
