#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Diagnostic script to test Azure Search directly and identify why retrieval returns only 3 chunks.
.DESCRIPTION
  Tests:
  1. Index existence and document count
  2. Vector search query with company_id filter
  3. BM25 search query with company_id filter
  4. Field schema verification
.EXAMPLE
  .\scripts\test-azure-search.ps1
#>

# Configuration
$azureSearchEndpoint = "https://amerivetsearch.search.windows.net"
$indexName = "chunks_prod_v2"
$apiVersion = "2024-05-01"
$companyId = "amerivet"

# Get API key from environment or prompt
$apiKey = $env:AZURE_SEARCH_API_KEY
if (-not $apiKey) {
    Write-Host "ERROR: AZURE_SEARCH_API_KEY environment variable not set" -ForegroundColor Red
    Write-Host "Set it with: `$env:AZURE_SEARCH_API_KEY='your-key'" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "api-key" = $apiKey
    "Content-Type" = "application/json"
}

Write-Host "=== Azure Search Diagnostic ===" -ForegroundColor Cyan
Write-Host "Endpoint: $azureSearchEndpoint" -ForegroundColor Gray
Write-Host "Index: $indexName" -ForegroundColor Gray
Write-Host "Company ID: $companyId" -ForegroundColor Gray
Write-Host ""

# Test 1: Get index stats
Write-Host "Test 1: Index Statistics" -ForegroundColor Yellow
try {
    $url = "$azureSearchEndpoint/indexes/$indexName/stats?api-version=$apiVersion"
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
    Write-Host "✅ Index found" -ForegroundColor Green
    Write-Host "   Document count: $($response.documentCount)" -ForegroundColor Green
    Write-Host "   Storage size: $($response.storageSize) bytes" -ForegroundColor Green
} catch {
    Write-Host "❌ Index stats failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: BM25 Search with company_id filter
Write-Host ""
Write-Host "Test 2: BM25 Full-Text Search (dental)" -ForegroundColor Yellow
try {
    $url = "$azureSearchEndpoint/indexes/$indexName/docs/search?api-version=$apiVersion"
    $body = @{
        search = "dental benefits"
        filter = "company_id eq '$companyId'"
        select = @("id", "document_id", "company_id", "content")
        top = 40
        queryType = "full"
        searchMode = "all"
        searchFields = @("content")
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method POST -Body $body
    $count = $response.value.Count
    Write-Host "✅ BM25 search executed" -ForegroundColor Green
    Write-Host "   Results returned: $count" -ForegroundColor Green
    Write-Host "   Expected: 40 (top param)" -ForegroundColor Gray
    
    if ($count -gt 0) {
        Write-Host "   First result ID: $($response.value[0].id)" -ForegroundColor Gray
        Write-Host "   First result company_id: $($response.value[0].company_id)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ BM25 search failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Vector Search (if embeddings field exists)
Write-Host ""
Write-Host "Test 3: Vector Search Configuration" -ForegroundColor Yellow
try {
    $url = "$azureSearchEndpoint/indexes/$indexName?api-version=$apiVersion"
    $indexDef = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
    
    $vectorField = $indexDef.fields | Where-Object { $_.type -eq "Collection(Edm.Single)" -or $_.type -like "*vector*" }
    if ($vectorField) {
        Write-Host "✅ Vector field found: $($vectorField[0].name)" -ForegroundColor Green
        Write-Host "   Type: $($vectorField[0].type)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  No vector field detected" -ForegroundColor Yellow
        Write-Host "   Vector search may not be configured" -ForegroundColor Gray
    }
    
    # Show all searchable fields
    $searchableFields = $indexDef.fields | Where-Object { $_.searchable -eq $true }
    Write-Host ""
    Write-Host "   Searchable fields:" -ForegroundColor Gray
    $searchableFields | ForEach-Object { Write-Host "     - $($_.name) ($($_.type))" -ForegroundColor Gray }
    
} catch {
    Write-Host "❌ Index definition fetch failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Company ID filter effectiveness
Write-Host ""
Write-Host "Test 4: Filter Effectiveness (all docs vs filtered)" -ForegroundColor Yellow
try {
    # Query WITHOUT filter
    $url = "$azureSearchEndpoint/indexes/$indexName/docs/search?api-version=$apiVersion"
    $bodyNoFilter = @{
        search = "*"
        top = 1
        select = @("id", "company_id")
        queryType = "full"
        searchMode = "any"
    } | ConvertTo-Json
    
    $responseNoFilter = Invoke-RestMethod -Uri $url -Headers $headers -Method POST -Body $bodyNoFilter
    $countNoFilter = $responseNoFilter.value.Count
    Write-Host "   Total docs in index: $countNoFilter" -ForegroundColor Gray
    
    # Query WITH filter
    $bodyWithFilter = @{
        search = "*"
        filter = "company_id eq '$companyId'"
        top = 1
        select = @("id", "company_id")
        queryType = "full"
        searchMode = "any"
    } | ConvertTo-Json
    
    $responseWithFilter = Invoke-RestMethod -Uri $url -Headers $headers -Method POST -Body $bodyWithFilter
    $countWithFilter = $responseWithFilter.value.Count
    Write-Host "   Docs with company_id='$companyId': $countWithFilter" -ForegroundColor Gray
    
    if ($countWithFilter -gt 0) {
        Write-Host "✅ Filter is working" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Filter returned 0 results - company_id may not match" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Filter test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Sample documents
Write-Host ""
Write-Host "Test 5: Sample Documents" -ForegroundColor Yellow
try {
    $url = "$azureSearchEndpoint/indexes/$indexName/docs/search?api-version=$apiVersion"
    $body = @{
        search = "*"
        filter = "company_id eq '$companyId'"
        select = @("id", "document_id", "company_id", "content")
        top = 5
        queryType = "full"
        searchMode = "any"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method POST -Body $body
    Write-Host "✅ Retrieved $($response.value.Count) sample documents:" -ForegroundColor Green
    $response.value | ForEach-Object -Begin { $i = 1 } {
        Write-Host "   [$i] ID: $($_.id)" -ForegroundColor Gray
        Write-Host "       Doc: $($_.document_id)" -ForegroundColor Gray
        Write-Host "       Company: $($_.company_id)" -ForegroundColor Gray
        Write-Host "       Content: $($_.content.Substring(0, [Math]::Min(60, $_.content.Length)))..." -ForegroundColor Gray
        $i++
    }
} catch {
    Write-Host "❌ Sample docs fetch failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Diagnostic Complete ===" -ForegroundColor Cyan
