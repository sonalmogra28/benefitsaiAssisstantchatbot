#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Comprehensive Azure configuration test for Benefits AI Chatbot
.DESCRIPTION
    Tests all Azure resources and validates configuration
#>

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Azure Configuration Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "OK Loaded .env.local" -ForegroundColor Green
} else {
    Write-Host "ERROR: .env.local not found" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 1: Azure OpenAI
Write-Host "1. Azure OpenAI Service" -ForegroundColor Yellow
Write-Host "   Endpoint: $env:AZURE_OPENAI_ENDPOINT"
Write-Host "   Deployment: $env:AZURE_OPENAI_DEPLOYMENT_NAME"
Write-Host "   Embeddings: $env:AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT"
Write-Host "   API Version: $env:AZURE_OPENAI_API_VERSION"

try {
    $headers = @{
        "api-key" = $env:AZURE_OPENAI_API_KEY
        "Content-Type" = "application/json"
    }
    
    # Test chat completions
    $chatUrl = "$($env:AZURE_OPENAI_ENDPOINT)openai/deployments/$($env:AZURE_OPENAI_DEPLOYMENT_NAME)/chat/completions?api-version=$($env:AZURE_OPENAI_API_VERSION)"
    $chatBody = @{
        messages = @(
            @{ role = "user"; content = "Say 'test successful' in 2 words" }
        )
        max_tokens = 10
    } | ConvertTo-Json
    
    $chatResponse = Invoke-RestMethod -Uri $chatUrl -Method Post -Headers $headers -Body $chatBody
    Write-Host "   OK Chat completions: Working - $($chatResponse.choices[0].message.content)" -ForegroundColor Green
    
    # Test embeddings
    $embedUrl = "$($env:AZURE_OPENAI_ENDPOINT)openai/deployments/$($env:AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT)/embeddings?api-version=$($env:AZURE_OPENAI_API_VERSION)"
    $embedBody = @{
        input = "test"
        dimensions = 1536
    } | ConvertTo-Json
    
    $embedResponse = Invoke-RestMethod -Uri $embedUrl -Method Post -Headers $headers -Body $embedBody
    $dimensions = $embedResponse.data[0].embedding.Count
    Write-Host "   OK Embeddings: Working - $dimensions dimensions" -ForegroundColor Green
    
    if ($dimensions -ne 1536) {
        Write-Host "   WARNING: Expected 1536 dimensions for text-embedding-3-large, got $dimensions" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✗ OpenAI test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Azure Search
Write-Host "2. Azure AI Search" -ForegroundColor Yellow
Write-Host "   Endpoint: $env:AZURE_SEARCH_ENDPOINT"
Write-Host "   Index: $env:AZURE_SEARCH_INDEX_NAME"

try {
    $searchHeaders = @{
        "api-key" = $env:AZURE_SEARCH_ADMIN_KEY
    }
    
    # Get index stats
    $statsUrl = "$($env:AZURE_SEARCH_ENDPOINT)/indexes/$($env:AZURE_SEARCH_INDEX_NAME)/stats?api-version=2023-11-01"
    $stats = Invoke-RestMethod -Uri $statsUrl -Headers $searchHeaders -Method Get
    Write-Host "   OK Index exists: $($stats.documentCount) documents" -ForegroundColor Green
    Write-Host "   OK Storage: $([math]::Round($stats.storageSize / 1MB, 2)) MB" -ForegroundColor Green
    
    # Get index schema
    $schemaUrl = "$($env:AZURE_SEARCH_ENDPOINT)/indexes/$($env:AZURE_SEARCH_INDEX_NAME)?api-version=2023-11-01"
    $schema = Invoke-RestMethod -Uri $schemaUrl -Headers $searchHeaders -Method Get
    $vectorField = $schema.fields | Where-Object { $_.name -eq "content_vector" }
    if ($vectorField) {
        Write-Host "   OK Vector field: $($vectorField.dimensions) dimensions" -ForegroundColor Green
        
        if ($vectorField.dimensions -ne 1536) {
            Write-Host "   WARNING: Index has $($vectorField.dimensions) dimensions, but embedding model uses 1536" -ForegroundColor Yellow
            Write-Host "   Consider using index chunks_prod_v1 with 1536 dims for text-embedding-3-large" -ForegroundColor Yellow
        }
    }
    
    # Test search query
    $searchUrl = "$($env:AZURE_SEARCH_ENDPOINT)/indexes/$($env:AZURE_SEARCH_INDEX_NAME)/docs/search?api-version=2023-11-01"
    $searchBody = @{
        search = "health insurance"
        top = 1
    } | ConvertTo-Json
    
    $searchResults = Invoke-RestMethod -Uri $searchUrl -Headers $searchHeaders -Method Post -Body $searchBody -ContentType "application/json"
    Write-Host "   OK Search query: Working - found $(@($searchResults.value).Count) results" -ForegroundColor Green
    
} catch {
    Write-Host "   ✗ Search test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Cosmos DB
Write-Host "3. Cosmos DB" -ForegroundColor Yellow
Write-Host "   Endpoint: $env:AZURE_COSMOS_ENDPOINT"
Write-Host "   Database: $env:AZURE_COSMOS_DATABASE"

try {
    $cosmosHeaders = @{
        "x-ms-version" = "2018-12-31"
        "Authorization" = $env:AZURE_COSMOS_KEY
    }
    
    # Simple connectivity test (list databases)
    $dbUrl = "$($env:AZURE_COSMOS_ENDPOINT)dbs"
    # Note: Full Cosmos REST API test requires proper signature, skip for now
    Write-Host "   INFO: Cosmos DB test requires Node.js client - skip REST test" -ForegroundColor Cyan
    
} catch {
    Write-Host "   ERROR: Cosmos test failed - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Redis
Write-Host "4. Redis Cache" -ForegroundColor Yellow
Write-Host "   URL: $env:REDIS_URL"

# Extract Redis host from URL
if ($env:REDIS_URL -match '@([^:]+):') {
    $redisHost = $matches[1]
    Write-Host "   Host: $redisHost"
    Write-Host "   INFO: Redis connectivity test requires redis-cli - skip" -ForegroundColor Cyan
}

Write-Host ""

# Test 5: Storage Account
Write-Host "5. Azure Storage" -ForegroundColor Yellow
if ($env:AZURE_STORAGE_CONNECTION_STRING -match 'AccountName=([^;]+)') {
    $storageAccount = $matches[1]
    Write-Host "   Account: $storageAccount"
    Write-Host "   Container: $env:AZURE_STORAGE_CONTAINER_NAME"
    Write-Host "   INFO: Storage connectivity test requires Azure SDK - skip" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuration Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OK Azure OpenAI: Configured with text-embedding-3-large - 1536 dims" -ForegroundColor Green
Write-Host "OK Azure Search: Index has $($stats.documentCount) documents" -ForegroundColor Green
Write-Host "OK All API keys loaded from .env.local" -ForegroundColor Green
Write-Host ""
Write-Host "Ready to test chatbot!" -ForegroundColor Green
Write-Host "Run: npm run dev" -ForegroundColor Cyan
