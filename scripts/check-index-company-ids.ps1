# Check Company IDs in Azure Search Index
# This script queries the Azure Search index to see what company_id values exist

# Read credentials from secure .env file
$envFile = "C:\Users\sonal\secrets\benefitsaichatbot-383\.env.production"
$searchKey = (Get-Content $envFile | Select-String "AZURE_SEARCH_API_KEY=" | ForEach-Object { $_.ToString().Split('=')[1] }).Trim()
$searchEndpoint = (Get-Content $envFile | Select-String "AZURE_SEARCH_ENDPOINT=" | ForEach-Object { $_.ToString().Split('=')[1] }).Trim()
$indexName = "chunks_prod_v1"

Write-Host "`n=== Checking Company IDs in Azure Search Index ===" -ForegroundColor Cyan

# Get sample documents
$headers = @{
    'api-key' = $searchKey
    'Content-Type' = 'application/json'
}

$searchBody = @{
    search = "*"
    top = 10
    select = "company_id,id,content"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod `
        -Uri "$searchEndpoint/indexes/$indexName/docs/search?api-version=2024-07-01" `
        -Method Post `
        -Headers $headers `
        -Body $searchBody `
        -ContentType 'application/json'

    Write-Host "`nTotal documents in index: $($response.'@odata.count')" -ForegroundColor Yellow
    Write-Host "`nSample company_id values found:" -ForegroundColor Cyan
    
    $companyIds = @{}
    foreach ($doc in $response.value) {
        $compId = $doc.company_id
        if ($compId) {
            if ($companyIds.ContainsKey($compId)) {
                $companyIds[$compId]++
            } else {
                $companyIds[$compId] = 1
            }
        }
    }

    foreach ($key in $companyIds.Keys) {
        Write-Host "  - '$key' (found in $($companyIds[$key]) sample docs)" -ForegroundColor Green
    }

    # Test search with 'amerivet' filter
    Write-Host "`n=== Testing Search with company_id='amerivet' ===" -ForegroundColor Cyan
    $filterBody = @{
        search = "dental"
        filter = "company_id eq 'amerivet'"
        top = 3
        select = "company_id,id,content"
    } | ConvertTo-Json

    $filterResponse = Invoke-RestMethod `
        -Uri "$searchEndpoint/indexes/$indexName/docs/search?api-version=2024-07-01" `
        -Method Post `
        -Headers $headers `
        -Body $filterBody `
        -ContentType 'application/json'

    Write-Host "Documents found with company_id='amerivet': $($filterResponse.'@odata.count')" -ForegroundColor Yellow
    
    if ($filterResponse.value.Count -gt 0) {
        Write-Host "`nFirst result:" -ForegroundColor Green
        Write-Host "  ID: $($filterResponse.value[0].id)" -ForegroundColor Gray
        Write-Host "  Company: $($filterResponse.value[0].company_id)" -ForegroundColor Gray
        $contentPreview = $filterResponse.value[0].content.Substring(0, [Math]::Min(150, $filterResponse.value[0].content.Length))
        Write-Host "  Content: $contentPreview..." -ForegroundColor White
    } else {
        Write-Host "`n⚠️  No documents found with company_id='amerivet'" -ForegroundColor Red
        Write-Host "Documents may be indexed with a different company_id value." -ForegroundColor Yellow
    }

} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n=== Recommendations ===" -ForegroundColor Cyan
Write-Host "1. If no documents found with 'amerivet', check what company_id was used during indexing" -ForegroundColor White
Write-Host "2. Verify document upload scripts use consistent company_id" -ForegroundColor White
Write-Host "3. Consider re-indexing documents with correct company_id if needed`n" -ForegroundColor White
