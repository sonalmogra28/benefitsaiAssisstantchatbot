# Production Verification Script
# Validates the hardened login endpoint in production

$baseUrl = 'https://amerivetaibot.bcgenrolls.com'

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PRODUCTION VERIFICATION - LOGIN ENDPOINT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: OPTIONS (CORS preflight)
Write-Host "TEST 1: OPTIONS /api/subdomain/auth/login (CORS preflight)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest "$baseUrl/api/subdomain/auth/login" -Method OPTIONS -UseBasicParsing
    Write-Host "  ✓ Status: $($response.StatusCode)" -ForegroundColor Green
    $allowMethods = $response.Headers['Access-Control-Allow-Methods']
    $allowHeaders = $response.Headers['Access-Control-Allow-Headers']
    Write-Host "  ✓ Allow-Methods: $allowMethods" -ForegroundColor Green
    Write-Host "  ✓ Allow-Headers: $allowHeaders" -ForegroundColor Green
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: GET (should return 405 JSON)
Write-Host "`nTEST 2: GET /api/subdomain/auth/login (should reject with 405)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest "$baseUrl/api/subdomain/auth/login" -Method GET -UseBasicParsing
    Write-Host "  ✗ FAILED: Expected 405, got $($response.StatusCode)" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 405) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "  ✓ Status: $statusCode" -ForegroundColor Green
        Write-Host "  ✓ Body: $body" -ForegroundColor Green
    } else {
        Write-Host "  ✗ FAILED: Expected 405, got $statusCode" -ForegroundColor Red
    }
}

# Test 3: POST with empty body (should return 400)
Write-Host "`nTEST 3: POST {} (empty body, should return 400)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest "$baseUrl/api/subdomain/auth/login" `
        -Method POST `
        -Headers @{'Content-Type'='application/json'} `
        -Body '{}' `
        -UseBasicParsing
    Write-Host "  ✗ FAILED: Expected 400, got $($response.StatusCode)" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    if ($statusCode -eq 400) {
        Write-Host "  ✓ Status: $statusCode" -ForegroundColor Green
        Write-Host "  ✓ Body: $body" -ForegroundColor Green
    } else {
        Write-Host "  ✗ FAILED: Expected 400, got $statusCode - $body" -ForegroundColor Red
    }
}

# Test 4: POST with wrong password (should return 401)
Write-Host "`nTEST 4: POST with wrong password (should return 401)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest "$baseUrl/api/subdomain/auth/login" `
        -Method POST `
        -Headers @{'Content-Type'='application/json'} `
        -Body '{"password":"wrongpassword123"}' `
        -UseBasicParsing
    Write-Host "  ✗ FAILED: Expected 401, got $($response.StatusCode)" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    if ($statusCode -eq 401) {
        Write-Host "  ✓ Status: $statusCode" -ForegroundColor Green
        Write-Host "  ✓ Body: $body" -ForegroundColor Green
    } else {
        Write-Host "  ✗ FAILED: Expected 401, got $statusCode - $body" -ForegroundColor Red
    }
}

# Test 5: POST with employee password (should return 200 with cookie)
Write-Host "`nTEST 5: POST with employee password (should return 200 + Set-Cookie)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest "$baseUrl/api/subdomain/auth/login" `
        -Method POST `
        -Headers @{'Content-Type'='application/json'} `
        -Body '{"password":"amerivet2024!"}' `
        -SessionVariable session `
        -UseBasicParsing
    Write-Host "  ✓ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "  ✓ Body: $($response.Content)" -ForegroundColor Green
    
    $setCookie = $response.Headers['Set-Cookie']
    if ($setCookie) {
        Write-Host "  ✓ Set-Cookie: $setCookie" -ForegroundColor Green
    } else {
        Write-Host "  ✗ WARNING: No Set-Cookie header found" -ForegroundColor Yellow
    }
    
    # Check cookie in session
    $cookie = $session.Cookies.GetCookies($baseUrl) | Where-Object { $_.Name -eq 'amerivet_session' }
    if ($cookie) {
        Write-Host "  ✓ Cookie stored: $($cookie.Name)=$($cookie.Value)" -ForegroundColor Green
        Write-Host "    - HttpOnly: $($cookie.HttpOnly)" -ForegroundColor Cyan
        Write-Host "    - Secure: $($cookie.Secure)" -ForegroundColor Cyan
        Write-Host "    - Path: $($cookie.Path)" -ForegroundColor Cyan
    } else {
        Write-Host "  ✗ WARNING: Cookie not stored in session" -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    Write-Host "  ✗ FAILED: $statusCode - $body" -ForegroundColor Red
}

# Test 6: POST with admin password (should return 200 with cookie)
Write-Host "`nTEST 6: POST with admin password (should return 200 + Set-Cookie)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest "$baseUrl/api/subdomain/auth/login" `
        -Method POST `
        -Headers @{'Content-Type'='application/json'} `
        -Body '{"password":"admin2024!"}' `
        -SessionVariable session2 `
        -UseBasicParsing
    Write-Host "  ✓ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "  ✓ Body: $($response.Content)" -ForegroundColor Green
    
    $setCookie = $response.Headers['Set-Cookie']
    if ($setCookie) {
        Write-Host "  ✓ Set-Cookie: $setCookie" -ForegroundColor Green
    } else {
        Write-Host "  ✗ WARNING: No Set-Cookie header found" -ForegroundColor Yellow
    }
    
    # Check cookie in session
    $cookie = $session2.Cookies.GetCookies($baseUrl) | Where-Object { $_.Name -eq 'amerivet_session' }
    if ($cookie) {
        Write-Host "  ✓ Cookie stored: $($cookie.Name)=$($cookie.Value)" -ForegroundColor Green
        Write-Host "    - Value should be 'admin': $($cookie.Value -eq 'admin')" -ForegroundColor Cyan
    } else {
        Write-Host "  ✗ WARNING: Cookie not stored in session" -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    Write-Host "  ✗ FAILED: $statusCode - $body" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "VERIFICATION COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open browser DevTools → Network tab" -ForegroundColor White
Write-Host "  2. Visit: $baseUrl/subdomain/login" -ForegroundColor White
Write-Host "  3. Enter password and submit" -ForegroundColor White
Write-Host "  4. Verify POST shows 200 + Set-Cookie header`n" -ForegroundColor White
