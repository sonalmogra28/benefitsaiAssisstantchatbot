# Comprehensive Fix Script - Senior Engineer Approach
# Fixes ALL remaining authentication and route issues

Write-Host "Starting comprehensive fix of all remaining issues..." -ForegroundColor Yellow

# Get all TypeScript files in app/api
$files = Get-ChildItem -Path "app/api" -Recurse -Filter "*.ts"

$fixedFiles = @()

foreach ($file in $files) {
    $content = Get-Content $file.FullName
    $originalContent = $content
    $modified = $false
    
    # Pattern 1: Fix protectAdminEndpoint calls
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'protectAdminEndpoint') {
            # Replace the entire function signature
            if ($content[$i] -match 'export async function (GET|POST|PUT|DELETE|PATCH)\(request: NextRequest\)') {
                $method = $matches[1]
                $content[$i] = "export const $method = requireCompanyAdmin(async (request: NextRequest) => {"
                $modified = $true
                
                # Add user extraction after the opening brace
                $j = $i + 1
                while ($j -lt $content.Length -and $content[$j] -notmatch '\{') {
                    $j++
                }
                if ($j -lt $content.Length) {
                    $content[$j] = "    // Extract user information from headers`n    const userId = request.headers.get('x-user-id')!;`n    const userCompanyId = request.headers.get('x-company-id')!;`n    `n    // Create user object for compatibility`n    const user = {`n      id: userId,`n      companyId: userCompanyId,`n      uid: userId`n    };`n" + $content[$j]
                }
            }
        }
    }
    
    # Pattern 2: Fix protectAdminEndpoint calls in function bodies
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'const \{ user, error \} = await protectAdminEndpoint\(request\);') {
            $content[$i] = "    // User information already extracted from headers"
            $modified = $true
        }
        if ($content[$i] -match 'if \(error \|\| !user\) \{') {
            $content[$i] = "    // User authentication handled by requireCompanyAdmin"
            $modified = $true
        }
        if ($content[$i] -match 'return error!;') {
            $content[$i] = "    // Error handling managed by requireCompanyAdmin"
            $modified = $true
        }
    }
    
    # Pattern 3: Fix function closing patterns
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match '^\s*\}\s*$' -and $i + 1 -lt $content.Length -and $content[$i + 1] -match '^\s*$') {
            # Check if this is the end of a requireCompanyAdmin function
            $j = $i - 1
            $foundFunction = $false
            while ($j -ge 0 -and $content[$j] -notmatch 'export const') {
                if ($content[$j] -match 'requireCompanyAdmin') {
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
    
    # Pattern 4: Fix user.id references
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'user\.id') {
            $content[$i] = $content[$i] -replace 'user\.id', 'userId'
            $modified = $true
        }
    }
    
    # Pattern 5: Fix user.companyId references
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'user\.companyId') {
            $content[$i] = $content[$i] -replace 'user\.companyId', 'userCompanyId'
            $modified = $true
        }
    }
    
    # Pattern 6: Fix user.uid references
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'user\.uid') {
            $content[$i] = $content[$i] -replace 'user\.uid', 'userId'
            $modified = $true
        }
    }
    
    # Only write if content changed
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content
        $fixedFiles += $file.Name
        Write-Host "Fixed: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host "`nComprehensive fix completed!" -ForegroundColor Green
Write-Host "Fixed $($fixedFiles.Count) files:" -ForegroundColor Cyan
$fixedFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
