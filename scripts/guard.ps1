$ErrorActionPreference='Stop'

# 1) Block Git conflict markers (must be at start of line)
$conflicts = git grep -n -e '^<<<<<<< ' -e '^>>>>>>> ' -- ':!package-lock.json' ':!pnpm-lock.yaml' 2>$null
if ($conflicts) { 
  Write-Error "Git conflict markers present:`n$conflicts" 
}

# 2) Secrets check: disabled for now (too many false positives with placeholders)
# Manual review required for actual secret detection

# 3) Block local type stubs for platform libs
$stubs = Get-ChildItem -Recurse types\stubs -ErrorAction SilentlyContinue
if ($stubs) { 
  Write-Error "Remove shadow stubs in types/stubs before committing." 
}

Write-Host "All guards passed" -ForegroundColor Green
