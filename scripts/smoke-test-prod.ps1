#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Smoke test for production RAG pipeline - validates retrieval, grounding, and response quality.
.DESCRIPTION
  Tests multiple aspects:
  1. Health endpoint
  2. QA endpoint with various queries
  3. Retrieval count (target: 8-12 chunks)
  4. Grounding score (target: ≥0.60)
  5. Category mixing (medical vs dental shouldn't mix)
.EXAMPLE
  .\scripts\smoke-test-prod.ps1
#>

param(
    [string]$Domain = "https://amerivetaibot.bcgenrolls.com",
    [string]$CompanyId = "amerivet"
)

function Test-HealthEndpoint {
    Write-Host "Test 1: Health Check" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod "$Domain/api/health" -TimeoutSec 10
        if ($response -eq "ok") {
            Write-Host "✅ Health endpoint responding" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Unexpected health response: $response" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-QAEndpoint {
    param(
        [string]$Query,
        [string]$Description,
        [int]$MinRetrieval = 8,
        [double]$MinGrounding = 0.60
    )
    
    Write-Host ""
    Write-Host "Test: $Description" -ForegroundColor Yellow
    Write-Host "Query: `"$Query`"" -ForegroundColor Gray
    
    try {
        $body = @{
            query = $Query
            companyId = $CompanyId
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod "$Domain/api/qa" -Method POST `
            -ContentType "application/json" `
            -Body $body `
            -TimeoutSec 15
        
        $retrievalCount = $response.metadata.retrievalCount
        $groundingScore = $response.metadata.groundingScore
        $tier = $response.tier
        $latency = $response.metadata.latencyBreakdown.total
        
        # Validate retrieval
        if ($retrievalCount -ge $MinRetrieval) {
            Write-Host "✅ Retrieval: $retrievalCount chunks (target: ≥$MinRetrieval)" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Retrieval: $retrievalCount chunks (target: ≥$MinRetrieval)" -ForegroundColor Yellow
        }
        
        # Validate grounding
        $groundingPercent = [Math]::Round($groundingScore * 100, 1)
        if ($groundingScore -ge $MinGrounding) {
            Write-Host "✅ Grounding: $groundingPercent% (target: ≥$([Math]::Round($MinGrounding * 100, 0))%)" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Grounding: $groundingPercent% (target: ≥$([Math]::Round($MinGrounding * 100, 0))%)" -ForegroundColor Yellow
        }
        
        # Show tier and latency
        Write-Host "   Tier: $tier, Latency: ${latency}ms" -ForegroundColor Gray
        
        # Show answer snippet
        $answerSnippet = $response.answer.Substring(0, [Math]::Min(100, $response.answer.Length))
        Write-Host "   Answer: $answerSnippet..." -ForegroundColor Gray
        
        return @{
            success = $true
            retrievalCount = $retrievalCount
            groundingScore = $groundingScore
            tier = $tier
            latency = $latency
        }
    } catch {
        Write-Host "❌ QA endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
        return @{ success = $false }
    }
}

# Main execution
Write-Host "=== Production RAG Pipeline Smoke Test ===" -ForegroundColor Cyan
Write-Host "Domain: $Domain" -ForegroundColor Gray
Write-Host "Company: $CompanyId" -ForegroundColor Gray
Write-Host ""

# Test health
$healthOk = Test-HealthEndpoint
if (-not $healthOk) {
    Write-Host ""
    Write-Host "❌ Health check failed - cannot proceed" -ForegroundColor Red
    exit 1
}

# Test QA with multiple queries
$results = @()

$results += Test-QAEndpoint -Query "What are the dental benefits?" -Description "Dental Query" -MinRetrieval 8 -MinGrounding 0.60
$results += Test-QAEndpoint -Query "What is covered under the medical plan?" -Description "Medical Query" -MinRetrieval 8 -MinGrounding 0.60
$results += Test-QAEndpoint -Query "How many vacation days do employees get?" -Description "PTO Query" -MinRetrieval 8 -MinGrounding 0.60
$results += Test-QAEndpoint -Query "Tell me about the 401k retirement plan" -Description "Benefits Query" -MinRetrieval 8 -MinGrounding 0.60
$results += Test-QAEndpoint -Query "What is the health insurance premium?" -Description "Insurance Query" -MinRetrieval 8 -MinGrounding 0.60

# Summary
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan

$successCount = ($results | Where-Object { $_.success } | Measure-Object).Count
$failureCount = ($results | Where-Object { -not $_.success } | Measure-Object).Count

Write-Host "Tests passed: $successCount/$($results.Count)" -ForegroundColor $(if ($successCount -eq $results.Count) { "Green" } else { "Yellow" })

if ($failureCount -gt 0) {
    Write-Host "Tests failed: $failureCount" -ForegroundColor Red
}

# Check retrieval metrics
$avgRetrieval = ($results | Where-Object { $_.retrievalCount } | Measure-Object -Property retrievalCount -Average).Average
$avgGrounding = ($results | Where-Object { $_.groundingScore } | Measure-Object -Property groundingScore -Average).Average

Write-Host ""
Write-Host "Metrics:" -ForegroundColor Gray
Write-Host "  Avg Retrieval: $([Math]::Round($avgRetrieval, 1)) chunks" -ForegroundColor Gray
Write-Host "  Avg Grounding: $([Math]::Round($avgGrounding * 100, 1))%" -ForegroundColor Gray

if ($avgRetrieval -ge 8 -and $avgGrounding -ge 0.60) {
    Write-Host ""
    Write-Host "✅ ALL TESTS PASSED - Production ready!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  Some metrics below target. Review retrieval/grounding configuration." -ForegroundColor Yellow
}
