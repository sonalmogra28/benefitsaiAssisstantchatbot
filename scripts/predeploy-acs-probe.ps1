#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Pre-deploy probe for Azure Cognitive Search index health.
.DESCRIPTION
  Checks that the configured index has at least a minimum number of documents
  for a given company filter. Exits non-zero if below threshold.
.PARAMETER Endpoint
  Azure Search endpoint, e.g. https://<service>.search.windows.net
.PARAMETER ApiKey
  Admin API key for Azure Search.
.PARAMETER Index
  Index name to probe.
.PARAMETER CompanyId
  Company/tenant id to filter on (filters by company_id eq '<CompanyId>').
.PARAMETER MinDocs
  Minimum number of documents required (default: 10).
.EXAMPLE
  .\scripts\predeploy-acs-probe.ps1 -Endpoint $env:AZURE_SEARCH_ENDPOINT -ApiKey $env:AZURE_SEARCH_API_KEY -Index $env:AZURE_SEARCH_INDEX -CompanyId amerivet -MinDocs 10
#>

param(
  [Parameter(Mandatory = $false)][string]$Endpoint = $env:AZURE_SEARCH_ENDPOINT,
  [Parameter(Mandatory = $false)][string]$ApiKey = $env:AZURE_SEARCH_API_KEY,
  [Parameter(Mandatory = $false)][string]$Index = $env:AZURE_SEARCH_INDEX,
  [Parameter(Mandatory = $false)][string]$CompanyId = "amerivet",
  [Parameter(Mandatory = $false)][int]$MinDocs = 10
)

$ErrorActionPreference = "Stop"

if (-not $Endpoint -or -not $ApiKey -or -not $Index) {
  Write-Host "❌ Missing required Azure Search env/params (Endpoint/ApiKey/Index)" -ForegroundColor Red
  exit 2
}

$uri = "$Endpoint/indexes/$Index/docs/search?api-version=2023-11-01"
$headers = @{ "api-key" = $ApiKey; "Content-Type" = "application/json" }

$bodyObj = @{ 
  count = $true
  top = 0
  filter = "company_id eq '$CompanyId'"
  queryType = "simple"
  search = "*"
}
$body = $bodyObj | ConvertTo-Json -Depth 5

try {
  $resp = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body -TimeoutSec 20
  $count = $resp."@odata.count"
  if ($null -eq $count) { $count = 0 }
  Write-Host "Azure Search probe: index=$Index company=$CompanyId count=$count (min=$MinDocs)" -ForegroundColor Cyan
  if ([int]$count -lt $MinDocs) {
    Write-Host "❌ Document count below threshold" -ForegroundColor Red
    exit 3
  }
  Write-Host "✅ Probe passed" -ForegroundColor Green
  exit 0
} catch {
  Write-Host "❌ Probe error: $($_.Exception.Message)" -ForegroundColor Red
  exit 4
}
