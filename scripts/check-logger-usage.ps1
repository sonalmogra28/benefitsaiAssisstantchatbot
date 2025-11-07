#!/usr/bin/env pwsh
param(
  [string]$Root = "."
)

$ErrorActionPreference = "Stop"

# Find forbidden direct logger usage outside lib/logger.ts
$forbidden = @()

$patterns = @(
  'import\s*\{\s*logger\s*\}\s*from\s*["'\`]@/lib/logger["'\`]',
  '\blogger\.'
)

# Restrict scope to critical paths to avoid failing legacy modules until migrated
$scanRoots = @(
  Join-Path $Root "app",
  Join-Path $Root "lib\rag",
  Join-Path $Root "lib\azure",
  Join-Path $Root "lib\cache"
)

$files = @()
foreach ($sr in $scanRoots) {
  if (Test-Path $sr) {
    $files += Get-ChildItem -Path $sr -Recurse -Include *.ts,*.tsx | Where-Object { $_.FullName -notmatch "lib\\logger\.ts$" }
  }
}

foreach ($file in $files) {
  $text = Get-Content $file.FullName -Raw
  foreach ($pat in $patterns) {
    if ($text -match $pat) {
      $forbidden += @{ file = $file.FullName; pattern = $pat }
      break
    }
  }
}

if ($forbidden.Count -gt 0) {
  Write-Host "❌ Forbidden logger usage detected (use 'log' adapter instead):" -ForegroundColor Red
  $forbidden | ForEach-Object { Write-Host " - $($_.file)" }
  exit 5
}

Write-Host "✅ Logger usage check passed" -ForegroundColor Green
exit 0
