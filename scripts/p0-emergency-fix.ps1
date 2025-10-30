# P0 Emergency Fix Script - 2 Hour Delivery
# Fixes ALL protectAdminEndpoint and protectSuperAdminEndpoint calls

Write-Host "P0 EMERGENCY FIX - Starting comprehensive fix..." -ForegroundColor Red

# Get all TypeScript files in app/api
$files = Get-ChildItem -Path "app/api" -Recurse -Filter "*.ts"

$fixedFiles = @()

foreach ($file in $files) {
    $content = Get-Content $file.FullName
    $originalContent = $content
    $modified = $false
    
    # Pattern 1: Fix protectAdminEndpoint imports
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'import.*protectAdminEndpoint.*from') {
            $content[$i] = $content[$i] -replace 'protectAdminEndpoint[^,]*', 'requireCompanyAdmin'
            $modified = $true
        }
    }
    
    # Pattern 2: Fix protectSuperAdminEndpoint imports
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'import.*protectSuperAdminEndpoint.*from') {
            $content[$i] = $content[$i] -replace 'protectSuperAdminEndpoint[^,]*', 'requireSuperAdmin'
            $modified = $true
        }
    }
    
    # Pattern 3: Fix protectCompanyEndpoint imports
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'import.*protectCompanyEndpoint.*from') {
            $content[$i] = $content[$i] -replace 'protectCompanyEndpoint[^,]*', 'requireCompanyAdmin'
            $modified = $true
        }
    }
    
    # Pattern 4: Fix function signatures - protectAdminEndpoint
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'export async function (GET|POST|PUT|DELETE|PATCH)\(request: NextRequest\)') {
            $method = $matches[1]
            $content[$i] = "export const $method = requireCompanyAdmin(async (request: NextRequest) => {"
            $modified = $true
        }
    }
    
    # Pattern 5: Fix function signatures - protectSuperAdminEndpoint
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'export async function (GET|POST|PUT|DELETE|PATCH)\(request: NextRequest\)') {
            $method = $matches[1]
            # Check if this is a super-admin route
            if ($file.FullName -match 'super-admin') {
                $content[$i] = "export const $method = requireSuperAdmin(async (request: NextRequest) => {"
            } else {
                $content[$i] = "export const $method = requireCompanyAdmin(async (request: NextRequest) => {"
            }
            $modified = $true
        }
    }
    
    # Pattern 6: Replace protectAdminEndpoint calls
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'const \{ user, error \} = await protectAdminEndpoint\(request\);') {
            $content[$i] = "    // Extract user information from headers`n    const userId = request.headers.get('x-user-id')!;`n    const userCompanyId = request.headers.get('x-company-id')!;"
            $modified = $true
        }
    }
    
    # Pattern 7: Replace protectSuperAdminEndpoint calls
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'const \{ user, error \} = await protectSuperAdminEndpoint\(request\);') {
            $content[$i] = "    // Extract user information from headers`n    const userId = request.headers.get('x-user-id')!;`n    const userCompanyId = request.headers.get('x-company-id')!;"
            $modified = $true
        }
    }
    
    # Pattern 8: Remove error handling blocks
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'if \(error \|\| !user\) \{') {
            $content[$i] = "    // Authentication handled by requireCompanyAdmin/requireSuperAdmin"
            $modified = $true
        }
        if ($content[$i] -match 'return error!;') {
            $content[$i] = "    // Error handling managed by auth middleware"
            $modified = $true
        }
    }
    
    # Pattern 9: Fix user references
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'user\.id') {
            $content[$i] = $content[$i] -replace 'user\.id', 'userId'
            $modified = $true
        }
        if ($content[$i] -match 'user\.companyId') {
            $content[$i] = $content[$i] -replace 'user\.companyId', 'userCompanyId'
            $modified = $true
        }
        if ($content[$i] -match 'user\.uid') {
            $content[$i] = $content[$i] -replace 'user\.uid', 'userId'
            $modified = $true
        }
    }
    
    # Pattern 10: Fix function closing
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match '^\s*\}\s*$' -and $i + 1 -lt $content.Length -and $content[$i + 1] -match '^\s*$') {
            # Check if this is the end of a requireCompanyAdmin/requireSuperAdmin function
            $j = $i - 1
            $foundFunction = $false
            while ($j -ge 0 -and $content[$j] -notmatch 'export const') {
                if ($content[$j] -match 'requireCompanyAdmin|requireSuperAdmin') {
                    $foundFunction = $true
                    break
                }
                $j--
            }
            if ($foundFunction -and $content[$i] -match '^\s*\}\s*$') {
                $content[$i] = "  });"
                $modified = $true
            }
        }
    }
    
    # Only write if content changed
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content
        $fixedFiles += $file.Name
        Write-Host "FIXED: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host "`nP0 EMERGENCY FIX COMPLETED!" -ForegroundColor Green
Write-Host "Fixed $($fixedFiles.Count) files:" -ForegroundColor Cyan
$fixedFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
