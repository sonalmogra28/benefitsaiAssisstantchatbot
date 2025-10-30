# Fix Authentication Imports Script
# Systematically updates all auth imports to use unified-auth

Write-Host "Fixing authentication imports..." -ForegroundColor Yellow

$files = @(
    "app\api\super-admin\users\route.ts",
    "app\api\test\email\route.ts", 
    "app\api\super-admin\companies\[id]\documents\upload\route.ts",
    "app\api\files\upload\route.ts",
    "app\api\super-admin\users\[id]\route.ts",
    "app\api\super-admin\settings\route.ts",
    "app\api\super-admin\export\route.ts",
    "app\api\super-admin\companies\[id]\route.ts",
    "app\api\super-admin\analytics\route.ts",
    "app\api\onboarding\route.ts",
    "app\api\employee\profile\route.ts",
    "app\api\employee\benefits\route.ts",
    "app\api\employee\benefits\enroll\route.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Fixing: $file" -ForegroundColor Cyan
        
        # Replace admin-middleware imports with unified-auth
        (Get-Content $file) -replace "from '@/lib/auth/admin-middleware'", "from '@/lib/auth/unified-auth'" | Set-Content $file
        
        # Replace middleware imports with unified-auth
        (Get-Content $file) -replace "from '@/lib/auth/middleware'", "from '@/lib/auth/unified-auth'" | Set-Content $file
        
        Write-Host "  ✓ Fixed" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "Authentication imports fixed!" -ForegroundColor Green
