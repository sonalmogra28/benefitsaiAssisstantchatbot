# Auto-resolve Git merge conflicts by keeping 'main' branch code
# Usage: .\scripts\resolve-conflicts.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔧 Auto-resolving merge conflicts (keeping 'main' branch)..." -ForegroundColor Cyan

# Find all files with conflict markers
$filesWithConflicts = git diff --name-only --diff-filter=U 2>$null

if (-not $filesWithConflicts) {
    # If git diff doesn't find them, search manually
    $filesWithConflicts = Get-ChildItem -Path . -Include *.ts,*.tsx,*.js,*.jsx,*.mjs -Recurse | 
        Where-Object { (Get-Content $_.FullName -Raw) -match '<<<<<<< HEAD' } |
        ForEach-Object { $_.FullName }
}

if (-not $filesWithConflicts -or $filesWithConflicts.Count -eq 0) {
    Write-Host "✅ No merge conflicts found!" -ForegroundColor Green
    exit 0
}

$resolvedCount = 0

foreach ($file in $filesWithConflicts) {
    if (-not $file) { continue }
    
    Write-Host "  Processing: $file" -ForegroundColor Yellow
    
    try {
        $content = Get-Content $file -Raw -ErrorAction Stop
        
        # Remove HEAD sections and conflict markers, keep only 'main' code
        # Pattern: <<<<<<< HEAD\n...content...\n=======\n...main content...\n>>>>>>> main
        $resolved = $content -replace '(?s)<<<<<<< HEAD.*?=======\s*', '' `
                             -replace '(?s)\s*>>>>>>> main', ''
        
        # Write back
        Set-Content -Path $file -Value $resolved -NoNewline -ErrorAction Stop
        $resolvedCount++
        
    } catch {
        Write-Host "  ⚠ Failed to process $file : $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Resolved $resolvedCount file(s)" -ForegroundColor Green
Write-Host "Run npm run typecheck to verify the fixes." -ForegroundColor Cyan
