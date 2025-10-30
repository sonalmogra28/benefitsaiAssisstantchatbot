# Comprehensive Route Fix Script - Senior Engineer Approach
# Fixes ALL possible route patterns systematically

Write-Host "Starting comprehensive route fixes..." -ForegroundColor Yellow

# Get all TypeScript files in app/api
$files = Get-ChildItem -Path "app/api" -Recurse -Filter "*.ts"

$fixedFiles = @()

foreach ($file in $files) {
    $content = Get-Content $file.FullName
    $originalContent = $content
    $modified = $false
    
    # Pattern 1: Fix withAuth patterns - withAuth(ROLE, async (request, context, user) => {
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'withAuth\(\s*([A-Z_]+),\s*async\s*\(\s*request:\s*NextRequest,\s*context:\s*any,\s*user:\s*any\s*\)\s*=>\s*\{') {
            $role = $matches[1]
            $content[$i] = $content[$i] -replace 'withAuth\(\s*([A-Z_]+),\s*async\s*\(\s*request:\s*NextRequest,\s*context:\s*any,\s*user:\s*any\s*\)\s*=>\s*\{', "withAuth($role)(`n  async (request: NextRequest) => {`n    // Extract user information from headers`n    const userId = request.headers.get('x-user-id')!;`n    const userEmail = request.headers.get('x-user-email')!;`n    const userCompanyId = request.headers.get('x-company-id')!;`n    const userRoles = request.headers.get('x-user-roles')?.split(',') || [];`n    `n    // Create user object for compatibility`n    const user = {`n      id: userId,`n      email: userEmail,`n      companyId: userCompanyId,`n      roles: userRoles,`n      uid: userId`n    };"
            $modified = $true
        }
    }
    
    # Pattern 2: Fix withAuth patterns - withAuth(ROLE, async (request, context) => {
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'withAuth\(\s*([A-Z_]+),\s*async\s*\(\s*request:\s*NextRequest,\s*context:\s*any\s*\)\s*=>\s*\{') {
            $role = $matches[1]
            $content[$i] = $content[$i] -replace 'withAuth\(\s*([A-Z_]+),\s*async\s*\(\s*request:\s*NextRequest,\s*context:\s*any\s*\)\s*=>\s*\{', "withAuth($role)(`n  async (request: NextRequest) => {`n    // Extract user information from headers`n    const userId = request.headers.get('x-user-id')!;`n    const userEmail = request.headers.get('x-user-email')!;`n    const userCompanyId = request.headers.get('x-company-id')!;`n    const userRoles = request.headers.get('x-user-roles')?.split(',') || [];`n    `n    // Create user object for compatibility`n    const user = {`n      id: userId,`n      email: userEmail,`n      companyId: userCompanyId,`n      roles: userRoles,`n      uid: userId`n    };"
            $modified = $true
        }
    }
    
    # Pattern 3: Fix route parameters - { params: { id: string } }
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match '\{\s*params:\s*\{\s*id:\s*string\s*\}\s*\}') {
            $content[$i] = $content[$i] -replace '\{\s*params:\s*\{\s*id:\s*string\s*\}\s*\}', '{ params: Promise<{ id: string }> }'
            $modified = $true
            
            # Add await params line after the function signature
            $j = $i + 1
            while ($j -lt $content.Length -and $content[$j] -notmatch '\{') {
                $j++
            }
            if ($j -lt $content.Length) {
                $content[$j] = "    const { id } = await params;`n" + $content[$j]
            }
        }
    }
    
    # Pattern 4: Fix params.id references to use awaited id
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'params\.id') {
            $content[$i] = $content[$i] -replace 'params\.id', 'id'
            $modified = $true
        }
    }
    
    # Pattern 5: Fix user.uid references to use userId
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'user\.uid') {
            $content[$i] = $content[$i] -replace 'user\.uid', 'userId'
            $modified = $true
        }
    }
    
    # Pattern 6: Fix user.companyId references to use userCompanyId
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'user\.companyId') {
            $content[$i] = $content[$i] -replace 'user\.companyId', 'userCompanyId'
            $modified = $true
        }
    }
    
    # Pattern 7: Fix user.email references to use userEmail
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'user\.email') {
            $content[$i] = $content[$i] -replace 'user\.email', 'userEmail'
            $modified = $true
        }
    }
    
    # Pattern 8: Fix user.roles references to use userRoles
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match 'user\.roles') {
            $content[$i] = $content[$i] -replace 'user\.roles', 'userRoles'
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

Write-Host "`nComprehensive route fixes completed!" -ForegroundColor Green
Write-Host "Fixed $($fixedFiles.Count) files:" -ForegroundColor Cyan
$fixedFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
