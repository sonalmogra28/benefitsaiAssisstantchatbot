# Production Smoke Test - Exact as specified

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PRODUCTION SMOKE TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Employee Login
Write-Host "TEST 1: Employee Login" -ForegroundColor Yellow
$r = Invoke-WebRequest 'https://amerivetaibot.bcgenrolls.com/api/subdomain/auth/login' `
    -Method POST `
    -Headers @{ 'Content-Type'='application/json' } `
    -Body '{"password":"amerivet2024!"}' `
    -SessionVariable S `
    -UseBasicParsing

Write-Host "Status Code: $($r.StatusCode)" -ForegroundColor Green
Write-Host "Response: $($r.Content)" -ForegroundColor White

$cookie = $S.Cookies.GetCookies('https://amerivetaibot.bcgenrolls.com')['amerivet_session']
if ($cookie) {
    Write-Host "Cookie: $($cookie.Name)=$($cookie.Value)" -ForegroundColor Green
    Write-Host "  HttpOnly: $($cookie.HttpOnly)" -ForegroundColor Cyan
    Write-Host "  Secure: $($cookie.Secure)" -ForegroundColor Cyan
    Write-Host "  Path: $($cookie.Path)" -ForegroundColor Cyan
} else {
    Write-Host "ERROR: No cookie set!" -ForegroundColor Red
}

# Test 2: Admin Login
Write-Host "`nTEST 2: Admin Login" -ForegroundColor Yellow
$r = Invoke-WebRequest 'https://amerivetaibot.bcgenrolls.com/api/subdomain/auth/login' `
    -Method POST `
    -Headers @{ 'Content-Type'='application/json' } `
    -Body '{"password":"admin2024!"}' `
    -SessionVariable S2 `
    -UseBasicParsing

Write-Host "Status Code: $($r.StatusCode)" -ForegroundColor Green
Write-Host "Response: $($r.Content)" -ForegroundColor White

$cookie = $S2.Cookies.GetCookies('https://amerivetaibot.bcgenrolls.com')['amerivet_session']
if ($cookie) {
    Write-Host "Cookie: $($cookie.Name)=$($cookie.Value)" -ForegroundColor Green
    Write-Host "  Expected 'admin': $(if ($cookie.Value -eq 'admin') { 'PASS' } else { 'FAIL' })" -ForegroundColor Cyan
} else {
    Write-Host "ERROR: No cookie set!" -ForegroundColor Red
}

# Test 3: Preflight
Write-Host "`nTEST 3: OPTIONS Preflight" -ForegroundColor Yellow
$r = Invoke-WebRequest 'https://amerivetaibot.bcgenrolls.com/api/subdomain/auth/login' `
    -Method OPTIONS `
    -UseBasicParsing

Write-Host "Status Code: $($r.StatusCode)" -ForegroundColor Green
Write-Host "Access-Control-Allow-Methods: $($r.Headers['Access-Control-Allow-Methods'])" -ForegroundColor Cyan
Write-Host "Access-Control-Allow-Headers: $($r.Headers['Access-Control-Allow-Headers'])" -ForegroundColor Cyan

# Test 4: Session Check
Write-Host "`nTEST 4: Session Check Endpoint" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest 'https://amerivetaibot.bcgenrolls.com/api/subdomain/auth/session' `
        -Method GET `
        -WebSession $S `
        -UseBasicParsing
    Write-Host "Status Code: $($r.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($r.Content)" -ForegroundColor White
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Response: $($reader.ReadToEnd())" -ForegroundColor White
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SMOKE TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
