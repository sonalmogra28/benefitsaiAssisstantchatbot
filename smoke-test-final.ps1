# Final Production Smoke Test - All Hardening Features

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "FINAL HARDENED PRODUCTION TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "https://amerivetaibot.bcgenrolls.com"

# Test 1: Employee Login
Write-Host "TEST 1: Employee Login (200 + cookie)" -ForegroundColor Yellow
$r = Invoke-WebRequest "$baseUrl/api/subdomain/auth/login" `
    -Method POST `
    -Headers @{ 'Content-Type'='application/json' } `
    -Body '{"password":"amerivet2024!"}' `
    -SessionVariable S `
    -UseBasicParsing

Write-Host "  Status: $($r.StatusCode) $(if ($r.StatusCode -eq 200) { '✓' } else { '✗' })" -ForegroundColor $(if ($r.StatusCode -eq 200) { 'Green' } else { 'Red' })
$cookie = $S.Cookies.GetCookies($baseUrl)['amerivet_session']
Write-Host "  Cookie: $($cookie.Value) $(if ($cookie.Value -eq 'employee') { '✓' } else { '✗' })" -ForegroundColor $(if ($cookie.Value -eq 'employee') { 'Green' } else { 'Red' })

# Test 2: Session Check (with cookie)
Write-Host "`nTEST 2: Session Check (authenticated)" -ForegroundColor Yellow
$r = Invoke-WebRequest "$baseUrl/api/subdomain/auth/session" `
    -Method GET `
    -WebSession $S `
    -UseBasicParsing

Write-Host "  Status: $($r.StatusCode) $(if ($r.StatusCode -eq 200) { '✓' } else { '✗' })" -ForegroundColor $(if ($r.StatusCode -eq 200) { 'Green' } else { 'Red' })
$body = $r.Content | ConvertFrom-Json
Write-Host "  Role: $($body.role) $(if ($body.role -eq 'employee') { '✓' } else { '✗' })" -ForegroundColor $(if ($body.role -eq 'employee') { 'Green' } else { 'Red' })

# Test 3: Logout
Write-Host "`nTEST 3: Logout (clear cookie)" -ForegroundColor Yellow
$r = Invoke-WebRequest "$baseUrl/api/subdomain/auth/logout" `
    -Method POST `
    -WebSession $S `
    -UseBasicParsing

Write-Host "  Status: $($r.StatusCode) $(if ($r.StatusCode -eq 200) { '✓' } else { '✗' })" -ForegroundColor $(if ($r.StatusCode -eq 200) { 'Green' } else { 'Red' })
$logoutCookie = $r.Headers['Set-Cookie']
Write-Host "  Cookie cleared: $(if ($logoutCookie -match 'Max-Age=0') { '✓' } else { '✗' })" -ForegroundColor $(if ($logoutCookie -match 'Max-Age=0') { 'Green' } else { 'Red' })

# Test 4: Session Check (after logout - should fail)
Write-Host "`nTEST 4: Session Check (after logout - should 401)" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest "$baseUrl/api/subdomain/auth/session" `
        -Method GET `
        -WebSession $S `
        -UseBasicParsing
    Write-Host "  ERROR: Should have returned 401!" -ForegroundColor Red
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $status $(if ($status -eq 401) { '✓' } else { '✗' })" -ForegroundColor $(if ($status -eq 401) { 'Green' } else { 'Red' })
}

# Test 5: Admin Login
Write-Host "`nTEST 5: Admin Login (200 + admin cookie)" -ForegroundColor Yellow
$r = Invoke-WebRequest "$baseUrl/api/subdomain/auth/login" `
    -Method POST `
    -Headers @{ 'Content-Type'='application/json' } `
    -Body '{"password":"admin2024!"}' `
    -SessionVariable S2 `
    -UseBasicParsing

Write-Host "  Status: $($r.StatusCode) $(if ($r.StatusCode -eq 200) { '✓' } else { '✗' })" -ForegroundColor $(if ($r.StatusCode -eq 200) { 'Green' } else { 'Red' })
$adminCookie = $S2.Cookies.GetCookies($baseUrl)['amerivet_session']
Write-Host "  Cookie: $($adminCookie.Value) $(if ($adminCookie.Value -eq 'admin') { '✓' } else { '✗' })" -ForegroundColor $(if ($adminCookie.Value -eq 'admin') { 'Green' } else { 'Red' })
$adminBody = $r.Content | ConvertFrom-Json
Write-Host "  Permissions: $($adminBody.permissions[0]) $(if ($adminBody.permissions[0] -eq '*') { '✓' } else { '✗' })" -ForegroundColor $(if ($adminBody.permissions[0] -eq '*') { 'Green' } else { 'Red' })

# Test 6: OPTIONS Preflight
Write-Host "`nTEST 6: OPTIONS Preflight (CORS)" -ForegroundColor Yellow
$r = Invoke-WebRequest "$baseUrl/api/subdomain/auth/login" `
    -Method OPTIONS `
    -UseBasicParsing

Write-Host "  Status: $($r.StatusCode) $(if ($r.StatusCode -eq 204) { '✓' } else { '✗' })" -ForegroundColor $(if ($r.StatusCode -eq 204) { 'Green' } else { 'Red' })
$allowMethods = $r.Headers['Access-Control-Allow-Methods']
Write-Host "  CORS: $allowMethods $(if ($allowMethods -match 'POST') { '✓' } else { '✗' })" -ForegroundColor $(if ($allowMethods -match 'POST') { 'Green' } else { 'Red' })

# Test 7: Wrong Password (401)
Write-Host "`nTEST 7: Wrong Password (should 401)" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest "$baseUrl/api/subdomain/auth/login" `
        -Method POST `
        -Headers @{ 'Content-Type'='application/json' } `
        -Body '{"password":"wrongpassword"}' `
        -UseBasicParsing
    Write-Host "  ERROR: Should have returned 401!" -ForegroundColor Red
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $status $(if ($status -eq 401) { '✓' } else { '✗' })" -ForegroundColor $(if ($status -eq 401) { 'Green' } else { 'Red' })
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
    Write-Host "  Error: $($errorBody.error) $(if ($errorBody.error -eq 'BAD_PASSWORD') { '✓' } else { '✗' })" -ForegroundColor $(if ($errorBody.error -eq 'BAD_PASSWORD') { 'Green' } else { 'Red' })
}

# Test 8: GET Method (should 405)
Write-Host "`nTEST 8: GET Method (should 405 JSON)" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest "$baseUrl/api/subdomain/auth/login" `
        -Method GET `
        -UseBasicParsing
    Write-Host "  ERROR: Should have returned 405!" -ForegroundColor Red
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $status $(if ($status -eq 405) { '✓' } else { '✗' })" -ForegroundColor $(if ($status -eq 405) { 'Green' } else { 'Red' })
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $errorBody = $reader.ReadToEnd()
    Write-Host "  Is JSON: $(if ($errorBody -match '"error"') { '✓' } else { '✗' })" -ForegroundColor $(if ($errorBody -match '"error"') { 'Green' } else { 'Red' })
}

# Test 9: Rate Limiting (manual - requires 6+ rapid attempts)
Write-Host "`nTEST 9: Rate Limiting (info only)" -ForegroundColor Yellow
Write-Host "  Limit: 5 attempts per 15 minutes" -ForegroundColor Cyan
Write-Host "  To test: Make 6 rapid login attempts with wrong password" -ForegroundColor Cyan
Write-Host "  Expected: 6th attempt returns 429 TOO_MANY_ATTEMPTS" -ForegroundColor Cyan

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ALL TESTS COMPLETE" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
