# Test the login endpoint with different payloads

Write-Host "`n=== Test 1: Empty body (should return 400 MISSING_PASSWORD) ===`n" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri 'https://amerivetaibot.bcgenrolls.com/api/subdomain/auth/login' `
        -Method POST `
        -Headers @{'Content-Type'='application/json'} `
        -Body '{}' `
        -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Body: $($response.Content)" -ForegroundColor White
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    Write-Host "Status: $statusCode" -ForegroundColor Yellow
    Write-Host "Body: $body" -ForegroundColor White
}

Write-Host "`n=== Test 2: Wrong password (should return 401 BAD_PASSWORD) ===`n" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri 'https://amerivetaibot.bcgenrolls.com/api/subdomain/auth/login' `
        -Method POST `
        -Headers @{'Content-Type'='application/json'} `
        -Body '{"password":"wrongpassword"}' `
        -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Body: $($response.Content)" -ForegroundColor White
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    Write-Host "Status: $statusCode" -ForegroundColor Yellow
    Write-Host "Body: $body" -ForegroundColor White
}

Write-Host "`n=== Test 3: Employee password (should return 200 with role=employee) ===`n" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri 'https://amerivetaibot.bcgenrolls.com/api/subdomain/auth/login' `
        -Method POST `
        -Headers @{'Content-Type'='application/json'} `
        -Body '{"password":"amerivet2024!"}' `
        -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Body: $($response.Content)" -ForegroundColor White
    Write-Host "Cookies: $($response.Headers['Set-Cookie'])" -ForegroundColor Cyan
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    Write-Host "Status: $statusCode" -ForegroundColor Yellow
    Write-Host "Body: $body" -ForegroundColor White
}

Write-Host "`n=== Test 4: Admin password (should return 200 with role=admin) ===`n" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri 'https://amerivetaibot.bcgenrolls.com/api/subdomain/auth/login' `
        -Method POST `
        -Headers @{'Content-Type'='application/json'} `
        -Body '{"password":"admin2024!"}' `
        -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Body: $($response.Content)" -ForegroundColor White
    Write-Host "Cookies: $($response.Headers['Set-Cookie'])" -ForegroundColor Cyan
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    Write-Host "Status: $statusCode" -ForegroundColor Yellow
    Write-Host "Body: $body" -ForegroundColor White
}
