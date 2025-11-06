# Final Production Validation Script
# Run this after Azure OpenAI deployments finish provisioning

Write-Host "`n=== PRODUCTION VALIDATION ===" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Gray

# Step 1: Check Azure OpenAI Deployments
Write-Host "[1/5] Checking Azure OpenAI deployments..." -ForegroundColor Yellow

$deployments = az cognitiveservices account deployment list `
    -g benefits-chatbot-project `
    -n amerivetopenai `
    --query "[].{Name:name,Status:properties.provisioningState}" `
    -o json 2>&1 | ConvertFrom-Json

if ($deployments.Count -eq 0) {
    Write-Host "   ❌ No deployments found!" -ForegroundColor Red
    Write-Host "   Run deployment creation script first`n" -ForegroundColor Yellow
    exit 1
}

$allSucceeded = $true
foreach ($dep in $deployments) {
    if ($dep.Status -eq "Succeeded") {
        Write-Host "   ✅ $($dep.Name): $($dep.Status)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $($dep.Name): $($dep.Status)" -ForegroundColor Yellow
        $allSucceeded = $false
    }
}

if (-not $allSucceeded) {
    Write-Host "`n   ⏳ Some deployments still provisioning. Wait 1-2 minutes and retry.`n" -ForegroundColor Yellow
    exit 0
}

# Step 2: Test Embedding Endpoint
Write-Host "`n[2/5] Testing embedding endpoint..." -ForegroundColor Yellow

# Read API key from secure .env file
$envFile = "C:\Users\sonal\secrets\benefitsaichatbot-383\.env.production"
$apiKey = (Get-Content $envFile | Select-String "AZURE_OPENAI_API_KEY=" | ForEach-Object { $_.ToString().Split('=')[1] }).Trim()

$headers = @{
    'api-key' = $apiKey
    'Content-Type' = 'application/json'
}

try {
    $embResult = Invoke-RestMethod `
        -Uri "https://amerivetopenai.openai.azure.com/openai/deployments/text-embedding-3-small/embeddings?api-version=2024-02-15-preview" `
        -Method Post `
        -Headers $headers `
        -Body '{"input":"test"}' `
        -TimeoutSec 10
    
    Write-Host "   ✅ Embedding API working (dims: $($embResult.data[0].embedding.Count))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Embedding API failed: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Test Chat Endpoint
Write-Host "`n[3/5] Testing chat endpoint..." -ForegroundColor Yellow

try {
    $chatResult = Invoke-RestMethod `
        -Uri "https://amerivetopenai.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-02-15-preview" `
        -Method Post `
        -Headers $headers `
        -Body '{"messages":[{"role":"user","content":"test"}],"max_tokens":10}' `
        -TimeoutSec 10
    
    Write-Host "   ✅ Chat API working (model: $($chatResult.model))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Chat API failed: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Test Production Health
Write-Host "`n[4/5] Testing production health endpoint..." -ForegroundColor Yellow

try {
    $healthResponse = Invoke-WebRequest -UseBasicParsing -Uri "https://amerivetaibot.bcgenrolls.com/api/health" -TimeoutSec 10
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "   ✅ Health: $($healthResponse.Content)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Health returned: $($healthResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Health check failed: $_" -ForegroundColor Red
}

# Step 5: Test Production QA Endpoint
Write-Host "`n[5/5] Testing production QA endpoint..." -ForegroundColor Yellow

$qaBody = '{"query":"What are the dental benefits?","companyId":"amerivet"}'

try {
    $qaStart = Get-Date
    $qaResult = Invoke-RestMethod `
        -Uri "https://amerivetaibot.bcgenrolls.com/api/qa" `
        -Method Post `
        -ContentType "application/json" `
        -Body $qaBody `
        -TimeoutSec 30
    $qaElapsed = ((Get-Date) - $qaStart).TotalSeconds
    
    Write-Host "   ✅ QA endpoint responded in $([math]::Round($qaElapsed, 2))s" -ForegroundColor Green
    
    # Check for demo mode
    if ($qaResult.answer -like "*demo environment*") {
        Write-Host "`n   ❌ STILL IN DEMO MODE!" -ForegroundColor Red
        Write-Host "   Answer preview: $($qaResult.answer.Substring(0, [Math]::Min(100, $qaResult.answer.Length)))...`n" -ForegroundColor Gray
        
        Write-Host "   Troubleshooting steps:" -ForegroundColor Yellow
        Write-Host "   1. Force redeploy: vercel --prod --force" -ForegroundColor White
        Write-Host "   2. Check Vercel logs: vercel logs https://amerivetaibot.bcgenrolls.com --since=5m" -ForegroundColor White
        Write-Host "   3. Verify env vars propagated: vercel env ls production`n" -ForegroundColor White
    } else {
        Write-Host "`n   ✅✅✅ RAG PIPELINE WORKING! ✅✅✅`n" -ForegroundColor Green
        Write-Host "   Answer preview:" -ForegroundColor Cyan
        Write-Host "   $($qaResult.answer.Substring(0, [Math]::Min(300, $qaResult.answer.Length)))..." -ForegroundColor White
        Write-Host "`n   Metadata:" -ForegroundColor Cyan
        Write-Host "   - Tier: $($qaResult.metadata.tier)" -ForegroundColor Gray
        Write-Host "   - Response Time: $($qaResult.metadata.responseTime)ms" -ForegroundColor Gray
        Write-Host "   - Sources: $($qaResult.sources.Count)" -ForegroundColor Gray
        Write-Host "   - Confidence: $($qaResult.confidence)`n" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "   ❌ QA endpoint failed: $_" -ForegroundColor Red
    Write-Host "   Check application logs for errors`n" -ForegroundColor Yellow
}

Write-Host "=== VALIDATION COMPLETE ===" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Gray
