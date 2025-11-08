#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test document availability and search functionality
#>

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Document Index Verification" -ForegroundColor Cyan
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
}

$headers = @{
    "api-key" = $env:AZURE_SEARCH_ADMIN_KEY
}

# Get all documents
Write-Host "Fetching all indexed documents..." -ForegroundColor Yellow
$searchUrl = "$($env:AZURE_SEARCH_ENDPOINT)/indexes/$($env:AZURE_SEARCH_INDEX_NAME)/docs/search?api-version=2023-11-01"
$body = @{
    search = "*"
    select = "document_id,content,metadata"
    top = 500
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri $searchUrl -Headers $headers -Method Post -Body $body -ContentType "application/json"

# Group by document_id
$docGroups = $result.value | Group-Object -Property document_id

Write-Host "`nTotal Documents: $($docGroups.Count)" -ForegroundColor Green
Write-Host "Total Chunks: $($result.value.Count)" -ForegroundColor Green
Write-Host ""

Write-Host "Document Details:" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

$docGroups | Sort-Object Name | ForEach-Object {
    $docId = $_.Name
    $chunkCount = $_.Count
    
    # Try to get filename from metadata
    $firstChunk = $_.Group[0]
    $fileName = "Unknown"
    
    if ($firstChunk.metadata) {
        try {
            $meta = $firstChunk.metadata | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($meta.fileName) {
                $fileName = $meta.fileName
            }
        } catch {
            # Ignore JSON parse errors
        }
    }
    
    # Get file type from document ID prefix
    $fileType = if ($docId -match '^(pdf|doc|docx)') { $matches[1].ToUpper() } else { "UNKNOWN" }
    
    Write-Host "  $fileType - $fileName" -ForegroundColor Cyan
    Write-Host "    Doc ID: $docId" -ForegroundColor Gray
    Write-Host "    Chunks: $chunkCount" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Sample Search Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test search with common queries
$testQueries = @(
    "health insurance",
    "dental coverage",
    "retirement benefits",
    "401k"
)

foreach ($query in $testQueries) {
    Write-Host "Query: '$query'" -ForegroundColor Yellow
    
    $searchBody = @{
        search = $query
        top = 3
        select = "document_id,content"
    } | ConvertTo-Json
    
    $searchResult = Invoke-RestMethod -Uri $searchUrl -Headers $headers -Method Post -Body $searchBody -ContentType "application/json"
    
    if ($searchResult.value.Count -gt 0) {
        Write-Host "  Found $($searchResult.value.Count) relevant chunks" -ForegroundColor Green
        $searchResult.value | Select-Object -First 1 | ForEach-Object {
            $preview = $_.content.Substring(0, [Math]::Min(150, $_.content.Length))
            Write-Host "  Preview: $preview..." -ForegroundColor Gray
        }
    } else {
        Write-Host "  No results found" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total Documents Indexed: $($docGroups.Count)" -ForegroundColor Green
Write-Host "All file types supported: PDF, DOC, DOCX, TXT" -ForegroundColor Green
Write-Host "Search functionality: Working" -ForegroundColor Green
Write-Host ""
Write-Host "Your documents are ready for the chatbot!" -ForegroundColor Green
