# Test PowerShell Script Syntax
Write-Host "=== Testing PowerShell Script Syntax ===" -ForegroundColor Cyan
Write-Host ""

$scripts = @(
    "fix-qa-assistant.ps1",
    "clean-vercel-env-vars.ps1",
    "populate-search-index.ps1",
    "test-qa-local.ps1"
)

foreach ($script in $scripts) {
    if (Test-Path $script) {
        Write-Host "Testing $script..." -ForegroundColor Gray
        $errors = $null
        $null = [System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $script).Path, [ref]$null, [ref]$errors)
        if ($errors) {
            Write-Host "  X Syntax errors" -ForegroundColor Red
        } else {
            Write-Host "  OK Valid" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "Done" -ForegroundColor Cyan
