# Fix withAuth Pattern Script
# Systematically fixes all withAuth usage patterns to match Next.js App Router requirements

Write-Host "Fixing withAuth patterns across all API routes..." -ForegroundColor Yellow

# Get all TypeScript files in app/api
$files = Get-ChildItem -Path "app/api" -Recurse -Filter "*.ts"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Pattern 1: withAuth(ROLE, async (request, context, user) => {
    $pattern1 = 'withAuth\(\s*([A-Z_]+),\s*async\s*\(\s*request:\s*NextRequest,\s*context:\s*any,\s*user:\s*any\s*\)\s*=>\s*\{'
    $replacement1 = 'withAuth($1)(`n  async (request: NextRequest) => {`n    // Extract user information from headers`n    const userId = request.headers.get(''x-user-id'')!;`n    const userEmail = request.headers.get(''x-user-email'')!;`n    const userCompanyId = request.headers.get(''x-company-id'')!;`n    const userRoles = request.headers.get(''x-user-roles'')?.split('','') || [];`n    `n    // Create user object for compatibility`n    const user = {`n      id: userId,`n      email: userEmail,`n      companyId: userCompanyId,`n      roles: userRoles,`n      uid: userId`n    };'
    
    $content = $content -replace $pattern1, $replacement1
    
    # Pattern 2: withAuth(ROLE, async (request, context) => {
    $pattern2 = 'withAuth\(\s*([A-Z_]+),\s*async\s*\(\s*request:\s*NextRequest,\s*context:\s*any\s*\)\s*=>\s*\{'
    $replacement2 = 'withAuth($1)(`n  async (request: NextRequest) => {`n    // Extract user information from headers`n    const userId = request.headers.get(''x-user-id'')!;`n    const userEmail = request.headers.get(''x-user-email'')!;`n    const userCompanyId = request.headers.get(''x-company-id'')!;`n    const userRoles = request.headers.get(''x-user-roles'')?.split('','') || [];`n    `n    // Create user object for compatibility`n    const user = {`n      id: userId,`n      email: userEmail,`n      companyId: userCompanyId,`n      roles: userRoles,`n      uid: userId`n    };'
    
    $content = $content -replace $pattern2, $replacement2
    
    # Pattern 3: withAuth(ROLE, async (request) => {
    $pattern3 = 'withAuth\(\s*([A-Z_]+),\s*async\s*\(\s*request:\s*NextRequest\s*\)\s*=>\s*\{'
    $replacement3 = 'withAuth($1)(`n  async (request: NextRequest) => {`n    // Extract user information from headers`n    const userId = request.headers.get(''x-user-id'')!;`n    const userEmail = request.headers.get(''x-user-email'')!;`n    const userCompanyId = request.headers.get(''x-company-id'')!;`n    const userRoles = request.headers.get(''x-user-roles'')?.split('','') || [];`n    `n    // Create user object for compatibility`n    const user = {`n      id: userId,`n      email: userEmail,`n      companyId: userCompanyId,`n      roles: userRoles,`n      uid: userId`n    };'
    
    $content = $content -replace $pattern3, $replacement3
    
    # Only write if content changed
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content
        Write-Host "Fixed: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host "withAuth pattern fixes completed!" -ForegroundColor Green
