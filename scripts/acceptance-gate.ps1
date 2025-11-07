#!/usr/bin/env pwsh
param(
  [string]$Domain = $env:PROD_DOMAIN,
  [string]$CompanyId = $env:COMPANY_ID
)

$ErrorActionPreference = "Stop"
if (-not $Domain) { Write-Error "Missing -Domain or PROD_DOMAIN"; exit 2 }
if (-not $CompanyId) { $CompanyId = "amerivet" }

Write-Host "Running acceptance gate against $Domain (company=$CompanyId)" -ForegroundColor Cyan
$output = & ./scripts/smoke-test-prod.ps1 -Domain $Domain -CompanyId $CompanyId 2>&1
Write-Host $output

if ($output -match '✅ ALL TESTS PASSED') {
  Write-Host "Acceptance gate PASSED" -ForegroundColor Green
  exit 0
} else {
  Write-Host "Acceptance gate FAILED" -ForegroundColor Red
  exit 3
}
