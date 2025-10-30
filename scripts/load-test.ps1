# Load Testing Script for Benefits AI Chatbot
# Tests 500 concurrent users as specified in requirements

param(
    [Parameter(Mandatory=$true)]
    [string]$AppUrl,
    
    [Parameter(Mandatory=$false)]
    [int]$ConcurrentUsers = 500,
    
    [Parameter(Mandatory=$false)]
    [int]$TestDurationMinutes = 10,
    
    [Parameter(Mandatory=$false)]
    [string]$TestType = "full" # full, quick, stress
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Load Test for Benefits AI Chatbot" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "App URL: $AppUrl" -ForegroundColor Cyan
Write-Host "Concurrent Users: $ConcurrentUsers" -ForegroundColor Cyan
Write-Host "Test Duration: $TestDurationMinutes minutes" -ForegroundColor Cyan
Write-Host "Test Type: $TestType" -ForegroundColor Cyan
Write-Host ""

# Function to log with timestamp
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        "INFO" { "White" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

# Test configuration based on type
$testConfig = switch ($TestType) {
    "quick" {
        @{
            ConcurrentUsers = 50
            TestDurationMinutes = 2
            RampUpSeconds = 30
            ThinkTimeSeconds = 2
        }
    }
    "stress" {
        @{
            ConcurrentUsers = 1000
            TestDurationMinutes = 15
            RampUpSeconds = 60
            ThinkTimeSeconds = 1
        }
    }
    default {
        @{
            ConcurrentUsers = $ConcurrentUsers
            TestDurationMinutes = $TestDurationMinutes
            RampUpSeconds = 120
            ThinkTimeSeconds = 3
        }
    }
}

Write-Log "Test Configuration:" "INFO"
Write-Log "  Concurrent Users: $($testConfig.ConcurrentUsers)" "INFO"
Write-Log "  Duration: $($testConfig.TestDurationMinutes) minutes" "INFO"
Write-Log "  Ramp-up: $($testConfig.RampUpSeconds) seconds" "INFO"
Write-Log "  Think Time: $($testConfig.ThinkTimeSeconds) seconds" "INFO"
Write-Host ""

# Test endpoints
$endpoints = @(
    @{
        Name = "Health Check"
        Url = "$AppUrl/api/health"
        Method = "GET"
        ExpectedStatus = 200
        Weight = 10
    },
    @{
        Name = "Auth Status"
        Url = "$AppUrl/api/auth/status"
        Method = "GET"
        ExpectedStatus = 200
        Weight = 20
    },
    @{
        Name = "Chat Health"
        Url = "$AppUrl/api/chat/health"
        Method = "GET"
        ExpectedStatus = 200
        Weight = 15
    },
    @{
        Name = "Analytics"
        Url = "$AppUrl/api/super-admin/stats"
        Method = "GET"
        ExpectedStatus = 200
        Weight = 5
    },
    @{
        Name = "Chat Message"
        Url = "$AppUrl/api/chat"
        Method = "POST"
        ExpectedStatus = 200
        Weight = 50
        Body = @{
            message = "What are my health insurance benefits?"
            conversationId = "load-test-{0}"
        } | ConvertTo-Json
    }
)

# Test results storage
$global:TestResults = @{
    TotalRequests = 0
    SuccessfulRequests = 0
    FailedRequests = 0
    ResponseTimes = @()
    Errors = @()
    StartTime = Get-Date
    EndTime = $null
}

# Function to make HTTP request
function Invoke-TestRequest {
    param(
        [hashtable]$Endpoint,
        [int]$UserId
    )
    
    $startTime = Get-Date
    $responseTime = 0
    $success = $false
    $error = $null
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
            "User-Agent" = "LoadTest-User-$UserId"
            "X-User-ID" = "load-test-user-$UserId"
        }
        
        $requestParams = @{
            Uri = $Endpoint.Url
            Method = $Endpoint.Method
            Headers = $headers
            TimeoutSec = 30
        }
        
        if ($Endpoint.Body) {
            $body = $Endpoint.Body -replace "{0}", $UserId
            $requestParams.Body = $body
        }
        
        $response = Invoke-RestMethod @requestParams
        $success = $true
        
    } catch {
        $error = $_.Exception.Message
        $success = $false
    } finally {
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        # Update global results
        $global:TestResults.TotalRequests++
        if ($success) {
            $global:TestResults.SuccessfulRequests++
        } else {
            $global:TestResults.FailedRequests++
            $global:TestResults.Errors += @{
                Endpoint = $Endpoint.Name
                Error = $error
                Timestamp = $startTime
                UserId = $UserId
            }
        }
        $global:TestResults.ResponseTimes += $responseTime
    }
    
    return @{
        Success = $success
        ResponseTime = $responseTime
        Error = $error
    }
}

# Function to simulate user behavior
function Start-UserSimulation {
    param(
        [int]$UserId,
        [int]$DurationMinutes
    )
    
    $endTime = (Get-Date).AddMinutes($DurationMinutes)
    $lastRequestTime = Get-Date
    
    Write-Log "User $UserId started simulation" "INFO"
    
    while ((Get-Date) -lt $endTime) {
        # Select endpoint based on weight
        $totalWeight = ($endpoints | Measure-Object -Property Weight -Sum).Sum
        $randomWeight = Get-Random -Minimum 1 -Maximum ($totalWeight + 1)
        $currentWeight = 0
        $selectedEndpoint = $null
        
        foreach ($endpoint in $endpoints) {
            $currentWeight += $endpoint.Weight
            if ($randomWeight -le $currentWeight) {
                $selectedEndpoint = $endpoint
                break
            }
        }
        
        # Make request
        $result = Invoke-TestRequest -Endpoint $selectedEndpoint -UserId $UserId
        
        if ($result.Success) {
            Write-Log "User $UserId - $($selectedEndpoint.Name): $([math]::Round($result.ResponseTime, 2))ms" "SUCCESS"
        } else {
            Write-Log "User $UserId - $($selectedEndpoint.Name): FAILED - $($result.Error)" "ERROR"
        }
        
        # Think time
        $thinkTime = Get-Random -Minimum ($testConfig.ThinkTimeSeconds * 500) -Maximum ($testConfig.ThinkTimeSeconds * 1500)
        Start-Sleep -Milliseconds $thinkTime
    }
    
    Write-Log "User $UserId completed simulation" "INFO"
}

# Function to run load test
function Start-LoadTest {
    Write-Log "Starting load test with $($testConfig.ConcurrentUsers) concurrent users..." "INFO"
    
    # Create user simulation jobs
    $jobs = @()
    for ($i = 1; $i -le $testConfig.ConcurrentUsers; $i++) {
        $job = Start-Job -ScriptBlock {
            param($UserId, $DurationMinutes, $AppUrl, $Endpoints, $TestConfig)
            
            # Import the functions into the job
            function Invoke-TestRequest {
                param([hashtable]$Endpoint, [int]$UserId)
                
                $startTime = Get-Date
                $responseTime = 0
                $success = $false
                $error = $null
                
                try {
                    $headers = @{
                        "Content-Type" = "application/json"
                        "User-Agent" = "LoadTest-User-$UserId"
                        "X-User-ID" = "load-test-user-$UserId"
                    }
                    
                    $requestParams = @{
                        Uri = $Endpoint.Url
                        Method = $Endpoint.Method
                        Headers = $headers
                        TimeoutSec = 30
                    }
                    
                    if ($Endpoint.Body) {
                        $body = $Endpoint.Body -replace "{0}", $UserId
                        $requestParams.Body = $body
                    }
                    
                    $response = Invoke-RestMethod @requestParams
                    $success = $true
                    
                } catch {
                    $error = $_.Exception.Message
                    $success = $false
                } finally {
                    $endTime = Get-Date
                    $responseTime = ($endTime - $startTime).TotalMilliseconds
                }
                
                return @{
                    Success = $success
                    ResponseTime = $responseTime
                    Error = $error
                }
            }
            
            function Start-UserSimulation {
                param([int]$UserId, [int]$DurationMinutes)
                
                $endTime = (Get-Date).AddMinutes($DurationMinutes)
                $results = @()
                
                while ((Get-Date) -lt $endTime) {
                    # Select endpoint based on weight
                    $totalWeight = ($Endpoints | Measure-Object -Property Weight -Sum).Sum
                    $randomWeight = Get-Random -Minimum 1 -Maximum ($totalWeight + 1)
                    $currentWeight = 0
                    $selectedEndpoint = $null
                    
                    foreach ($endpoint in $Endpoints) {
                        $currentWeight += $endpoint.Weight
                        if ($randomWeight -le $currentWeight) {
                            $selectedEndpoint = $endpoint
                            break
                        }
                    }
                    
                    # Make request
                    $result = Invoke-TestRequest -Endpoint $selectedEndpoint -UserId $UserId
                    $results += $result
                    
                    # Think time
                    $thinkTime = Get-Random -Minimum ($TestConfig.ThinkTimeSeconds * 500) -Maximum ($TestConfig.ThinkTimeSeconds * 1500)
                    Start-Sleep -Milliseconds $thinkTime
                }
                
                return $results
            }
            
            return Start-UserSimulation -UserId $UserId -DurationMinutes $DurationMinutes
        } -ArgumentList $i, $testConfig.TestDurationMinutes, $AppUrl, $endpoints, $testConfig
        
        $jobs += $job
        
        # Ramp up users gradually
        if ($i % 50 -eq 0) {
            Write-Log "Started $i users..." "INFO"
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Log "All $($testConfig.ConcurrentUsers) users started. Running test for $($testConfig.TestDurationMinutes) minutes..." "SUCCESS"
    
    # Wait for all jobs to complete
    $jobs | Wait-Job | Out-Null
    
    # Collect results
    $allResults = @()
    foreach ($job in $jobs) {
        $jobResults = Receive-Job -Job $job
        $allResults += $jobResults
        Remove-Job -Job $job
    }
    
    return $allResults
}

# Function to generate test report
function Generate-TestReport {
    param($Results)
    
    $global:TestResults.EndTime = Get-Date
    $totalDuration = ($global:TestResults.EndTime - $global:TestResults.StartTime).TotalMinutes
    
    Write-Host "`n📊 LOAD TEST RESULTS" -ForegroundColor Green
    Write-Host "===================" -ForegroundColor Yellow
    Write-Host ""
    
    # Basic metrics
    $totalRequests = $Results.Count
    $successfulRequests = ($Results | Where-Object { $_.Success }).Count
    $failedRequests = $totalRequests - $successfulRequests
    $successRate = if ($totalRequests -gt 0) { [math]::Round(($successfulRequests / $totalRequests) * 100, 2) } else { 0 }
    
    Write-Host "Test Duration: $([math]::Round($totalDuration, 2)) minutes" -ForegroundColor White
    Write-Host "Total Requests: $totalRequests" -ForegroundColor White
    Write-Host "Successful Requests: $successfulRequests" -ForegroundColor Green
    Write-Host "Failed Requests: $failedRequests" -ForegroundColor Red
    Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 95) { "Green" } elseif ($successRate -ge 90) { "Yellow" } else { "Red" })
    Write-Host ""
    
    # Response time metrics
    $responseTimes = $Results | Where-Object { $_.Success } | ForEach-Object { $_.ResponseTime }
    if ($responseTimes.Count -gt 0) {
        $avgResponseTime = [math]::Round(($responseTimes | Measure-Object -Average).Average, 2)
        $minResponseTime = [math]::Round(($responseTimes | Measure-Object -Minimum).Minimum, 2)
        $maxResponseTime = [math]::Round(($responseTimes | Measure-Object -Maximum).Maximum, 2)
        $p95ResponseTime = [math]::Round(($responseTimes | Sort-Object | Select-Object -Skip ([math]::Floor($responseTimes.Count * 0.05)) | Select-Object -First 1), 2)
        $p99ResponseTime = [math]::Round(($responseTimes | Sort-Object | Select-Object -Skip ([math]::Floor($responseTimes.Count * 0.01)) | Select-Object -First 1), 2)
        
        Write-Host "Response Time Metrics:" -ForegroundColor Cyan
        Write-Host "  Average: $avgResponseTime ms" -ForegroundColor White
        Write-Host "  Minimum: $minResponseTime ms" -ForegroundColor White
        Write-Host "  Maximum: $maxResponseTime ms" -ForegroundColor White
        Write-Host "  95th Percentile: $p95ResponseTime ms" -ForegroundColor White
        Write-Host "  99th Percentile: $p99ResponseTime ms" -ForegroundColor White
        Write-Host ""
    }
    
    # Throughput
    $requestsPerSecond = [math]::Round($totalRequests / ($totalDuration * 60), 2)
    Write-Host "Throughput: $requestsPerSecond requests/second" -ForegroundColor Cyan
    Write-Host ""
    
    # Error analysis
    $errorGroups = $Results | Where-Object { -not $_.Success } | Group-Object Error | Sort-Object Count -Descending
    if ($errorGroups.Count -gt 0) {
        Write-Host "Error Analysis:" -ForegroundColor Red
        foreach ($errorGroup in $errorGroups) {
            Write-Host "  $($errorGroup.Name): $($errorGroup.Count) occurrences" -ForegroundColor White
        }
        Write-Host ""
    }
    
    # Performance assessment
    Write-Host "Performance Assessment:" -ForegroundColor Yellow
    if ($successRate -ge 99 -and $avgResponseTime -le 2000) {
        Write-Host "✅ EXCELLENT - System handles load very well" -ForegroundColor Green
    } elseif ($successRate -ge 95 -and $avgResponseTime -le 5000) {
        Write-Host "✅ GOOD - System handles load adequately" -ForegroundColor Green
    } elseif ($successRate -ge 90 -and $avgResponseTime -le 10000) {
        Write-Host "⚠️ ACCEPTABLE - System handles load but needs optimization" -ForegroundColor Yellow
    } else {
        Write-Host "❌ POOR - System struggles under load, requires immediate attention" -ForegroundColor Red
    }
    
    # Recommendations
    Write-Host "`nRecommendations:" -ForegroundColor Cyan
    if ($successRate -lt 95) {
        Write-Host "• Investigate and fix error causes" -ForegroundColor White
    }
    if ($avgResponseTime -gt 5000) {
        Write-Host "• Optimize response times - consider caching or scaling" -ForegroundColor White
    }
    if ($p95ResponseTime -gt 10000) {
        Write-Host "• Address performance bottlenecks" -ForegroundColor White
    }
    if ($requestsPerSecond -lt 10) {
        Write-Host "• Consider horizontal scaling for better throughput" -ForegroundColor White
    }
    
    Write-Host "`n🎯 Load test completed!" -ForegroundColor Green
}

# Main execution
try {
    Write-Log "Preparing load test..." "INFO"
    
    # Pre-flight check
    try {
        $healthResponse = Invoke-RestMethod -Uri "$AppUrl/api/health" -Method GET -TimeoutSec 10
        Write-Log "Pre-flight check passed - application is accessible" "SUCCESS"
    } catch {
        Write-Log "Pre-flight check failed - application is not accessible: $_" "ERROR"
        exit 1
    }
    
    # Run load test
    $results = Start-LoadTest
    
    # Generate report
    Generate-TestReport -Results $results
    
} catch {
    Write-Log "Load test failed: $_" "ERROR"
    exit 1
}

Write-Host "`n📋 Load Test Summary:" -ForegroundColor Green
Write-Host "• Tested $($testConfig.ConcurrentUsers) concurrent users" -ForegroundColor White
Write-Host "• Duration: $($testConfig.TestDurationMinutes) minutes" -ForegroundColor White
Write-Host "• Application URL: $AppUrl" -ForegroundColor White
Write-Host "• Results saved to console output" -ForegroundColor White
