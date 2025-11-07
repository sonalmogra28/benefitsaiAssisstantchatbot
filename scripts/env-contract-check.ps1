#!/usr/bin/env pwsh
param(
  [string]$Root = "."
)

$ErrorActionPreference = "Stop"

# Ensure code does NOT reference legacy AZURE_SEARCH_INDEX_NAME
$legacyHits = Select-String -Path (Join-Path $Root "**/*.*") -Pattern "AZURE_SEARCH_INDEX_NAME" -CaseSensitive -SimpleMatch -ErrorAction SilentlyContinue
if ($legacyHits) {
  Write-Host "❌ Found references to legacy env var AZURE_SEARCH_INDEX_NAME:" -ForegroundColor Red
  $legacyHits | ForEach-Object { Write-Host " - $($_.Path):$($_.LineNumber) $($_.Line.Trim())" }
  exit 10
}

# Ensure code DOES reference the canonical AZURE_SEARCH_INDEX
$canonicalHits = Select-String -Path (Join-Path $Root "**/*.*") -Pattern "AZURE_SEARCH_INDEX" -CaseSensitive -SimpleMatch -ErrorAction SilentlyContinue
if (-not $canonicalHits) {
  Write-Host "❌ No references to AZURE_SEARCH_INDEX found in codebase" -ForegroundColor Red
  exit 11
}

Write-Host "✅ Env contract check passed (AZURE_SEARCH_INDEX only)" -ForegroundColor Green
exit 0
