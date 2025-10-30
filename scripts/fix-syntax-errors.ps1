# Principal Coder Fix - Remove misplaced }); and fix function structure
Write-Host "Fixing syntax errors like a principal coder..." -ForegroundColor Cyan

$files = @(
    "app/api/admin/analytics/llm-routing/route.ts",
    "app/api/admin/benefit-plans/route.ts", 
    "app/api/admin/embed/route.ts",
    "app/api/admin/faqs/route.ts",
    "app/api/admin/settings/route.ts"
)

foreach ($file in $files) {
    $content = Get-Content $file
    $modified = $false
    
    # Pattern 1: Remove misplaced }); that break function structure
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match '^\s*\}\);\s*$' -and $i + 1 -lt $content.Length -and $content[$i + 1] -match '^\s*$') {
            # Check if next line starts with code (not export or comment)
            $j = $i + 1
            while ($j -lt $content.Length -and $content[$j] -match '^\s*$') {
                $j++
            }
            if ($j -lt $content.Length -and $content[$j] -notmatch '^(export|//|\/\*)') {
                $content[$i] = ""
                $modified = $true
            }
        }
    }
    
    # Pattern 2: Remove comment lines that break function flow
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match '^\s*// Authentication handled by requireCompanyAdmin/requireSuperAdmin\s*$' -or 
            $content[$i] -match '^\s*// Error handling managed by auth middleware\s*$') {
            $content[$i] = ""
            $modified = $true
        }
    }
    
    # Pattern 3: Fix function endings - find export const and fix closing
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'export const (GET|POST|PUT|DELETE|PATCH) = requireCompanyAdmin\(async \(request: NextRequest\) => \{') {
            $method = $matches[1]
            # Find the matching closing brace
            $braceCount = 1
            $j = $i + 1
            while ($j -lt $content.Length -and $braceCount > 0) {
                if ($content[$j] -match '\{') { $braceCount++ }
                if ($content[$j] -match '\}') { $braceCount-- }
                $j++
            }
            if ($j -lt $content.Length -and $content[$j - 1] -match '^\s*\}\s*$') {
                $content[$j - 1] = "  });"
                $modified = $true
            }
        }
    }
    
    if ($modified) {
        Set-Content -Path $file -Value $content
        Write-Host "FIXED: $file" -ForegroundColor Green
    }
}

Write-Host "Syntax errors fixed!" -ForegroundColor Green
