# Test QA Endpoint and Show Full Error Details

$url = "https://amerivetaibot.bcgenrolls.com/api/qa"
$body = @{
    query = "What are my dental benefits?"
    companyId = "amerivet"
} | ConvertTo-Json

Write-Host "`n=== Testing QA Endpoint ===" -ForegroundColor Cyan
Write-Host "URL: $url" -ForegroundColor Gray
Write-Host "Body: $body`n" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "`nAnswer:" -ForegroundColor Cyan
    Write-Host $response.answer.Substring(0, [Math]::Min(500, $response.answer.Length))
    Write-Host "`nMetadata:" -ForegroundColor Cyan
    $response.metadata | ConvertTo-Json
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ HTTP $statusCode Error" -ForegroundColor Red
    
    # Try to read response body
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        $reader.Close()
        
        Write-Host "`nResponse Body:" -ForegroundColor Yellow
        Write-Host $responseBody
        
        try {
            $errorJson = $responseBody | ConvertFrom-Json
            Write-Host "`nParsed Error:" -ForegroundColor Cyan
            Write-Host "  Error: $($errorJson.error)" -ForegroundColor White
            Write-Host "  Details: $($errorJson.details)" -ForegroundColor White
            Write-Host "  Timestamp: $($errorJson.timestamp)" -ForegroundColor Gray
        } catch {
            Write-Host "  (Could not parse as JSON)" -ForegroundColor Gray
        }
    }
    
    Write-Host "`nException Message:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
}

Write-Host "`n=== Test Complete ===`n" -ForegroundColor Cyan
