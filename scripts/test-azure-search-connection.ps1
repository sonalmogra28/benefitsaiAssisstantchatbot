# Test Azure Search Connection with Production Credentials
# This script tests if the hybrid retrieval can connect to Azure Search

# Read credentials from secure .env file
$envFile = "C:\Users\sonal\secrets\benefitsaichatbot-383\.env.production"
$searchEndpoint = (Get-Content $envFile | Select-String "AZURE_SEARCH_ENDPOINT=" | ForEach-Object { $_.ToString().Split('=')[1] }).Trim()
$searchKey = (Get-Content $envFile | Select-String "AZURE_SEARCH_API_KEY=" | ForEach-Object { $_.ToString().Split('=')[1] }).Trim()
$indexName = "chunks_prod_v1"
$openAIEndpoint = (Get-Content $envFile | Select-String "AZURE_OPENAI_ENDPOINT=" | ForEach-Object { $_.ToString().Split('=')[1] }).Trim()
$openAIKey = (Get-Content $envFile | Select-String "AZURE_OPENAI_API_KEY=" | ForEach-Object { $_.ToString().Split('=')[1] }).Trim()

Write-Host "`n=== Testing Azure Search Connection ===" -ForegroundColor Cyan

# Test 1: Check if index exists
Write-Host "`n[Test 1] Checking if index exists..." -ForegroundColor Yellow
$headers = @{
    'api-key' = $searchKey
}

try {
    $indexResponse = Invoke-RestMethod `
        -Uri "$searchEndpoint/indexes/$indexName`?api-version=2024-07-01" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✅ Index exists: $($indexResponse.name)" -ForegroundColor Green
    Write-Host "   Fields: $($indexResponse.fields.Count)" -ForegroundColor Gray
    Write-Host "   Vector search: $(if ($indexResponse.vectorSearch) { 'Enabled' } else { 'Disabled' })" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to access index: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Simple search query
Write-Host "`n[Test 2] Testing simple search..." -ForegroundColor Yellow
$searchBody = @{
    search = "dental"
    filter = "company_id eq 'amerivet'"
    top = 3
} | ConvertTo-Json

try {
    $searchResponse = Invoke-RestMethod `
        -Uri "$searchEndpoint/indexes/$indexName/docs/search?api-version=2024-07-01" `
        -Method Post `
        -Headers $headers `
        -Body $searchBody `
        -ContentType 'application/json'
    
    Write-Host "✅ Search successful" -ForegroundColor Green
    Write-Host "   Results: $($searchResponse.value.Count)" -ForegroundColor Gray
    
    if ($searchResponse.value.Count -gt 0) {
        Write-Host "   First result ID: $($searchResponse.value[0].id)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Search failed: $_" -ForegroundColor Red
}

# Test 3: Get embedding from Azure OpenAI
Write-Host "`n[Test 3] Testing Azure OpenAI embeddings..." -ForegroundColor Yellow
$embeddingHeaders = @{
    'api-key' = $openAIKey
    'Content-Type' = 'application/json'
}

$embeddingBody = @{
    input = "dental benefits"
} | ConvertTo-Json

try {
    $embeddingResponse = Invoke-RestMethod `
        -Uri "$openAIEndpoint/openai/deployments/text-embedding-ada-002/embeddings?api-version=2024-02-15-preview" `
        -Method Post `
        -Headers $embeddingHeaders `
        -Body $embeddingBody `
        -ContentType 'application/json'
    
    $embedding = $embeddingResponse.data[0].embedding
    Write-Host "✅ Embedding generated" -ForegroundColor Green
    Write-Host "   Dimensions: $($embedding.Count)" -ForegroundColor Gray
    Write-Host "   First 5 values: $($embedding[0..4] -join ', ')" -ForegroundColor Gray
    
    # Test 4: Vector search with embedding
    Write-Host "`n[Test 4] Testing vector search..." -ForegroundColor Yellow
    $vectorSearchBody = @{
        search = "*"
        vectorQueries = @(
            @{
                kind = "vector"
                vector = $embedding
                k = 3
                fields = "content_vector"
            }
        )
        filter = "company_id eq 'amerivet'"
        top = 3
    } | ConvertTo-Json -Depth 10
    
    $vectorResponse = Invoke-RestMethod `
        -Uri "$searchEndpoint/indexes/$indexName/docs/search?api-version=2024-07-01" `
        -Method Post `
        -Headers $headers `
        -Body $vectorSearchBody `
        -ContentType 'application/json'
    
    Write-Host "✅ Vector search successful" -ForegroundColor Green
    Write-Host "   Results: $($vectorResponse.value.Count)" -ForegroundColor Gray
    
    if ($vectorResponse.value.Count -gt 0) {
        Write-Host "   First result:" -ForegroundColor Gray
        Write-Host "     ID: $($vectorResponse.value[0].id)" -ForegroundColor Gray
        Write-Host "     Score: $($vectorResponse.value[0]['@search.score'])" -ForegroundColor Gray
        $content = $vectorResponse.value[0].content.Substring(0, [Math]::Min(100, $vectorResponse.value[0].content.Length))
        Write-Host "     Content: $content..." -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ Embedding/vector search failed: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "If all tests passed, the issue is likely in the application code, not Azure services." -ForegroundColor Yellow
Write-Host "Check the Vercel environment variables match these values exactly.`n" -ForegroundColor Yellow
