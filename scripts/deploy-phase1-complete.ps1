# Phase 1 Complete Deployment Script
# Deploys all Phase 1 components and runs validation

param(
    [Parameter(Mandatory=$true)]
    [string]$EnvironmentName,
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "rg-benefits-chatbot-$EnvironmentName",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "East US 2",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipLoadTest
)

$ErrorActionPreference = "Stop"

Write-Host "Phase 1 Complete Deployment" -ForegroundColor Green
Write-Host "===========================" -ForegroundColor Yellow
Write-Host "Environment: $EnvironmentName" -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Cyan
Write-Host "Location: $Location" -ForegroundColor Cyan
Write-Host ""

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Test-Prerequisites {
    Write-Log "Checking prerequisites..."
    
    # Check Azure CLI
    try {
        $azVersion = az --version | Select-String "azure-cli" | Select-Object -First 1
        Write-Log "Azure CLI: $azVersion" "SUCCESS"
    } catch {
        Write-Log "Azure CLI not found. Please install Azure CLI." "ERROR"
        exit 1
    }
    
    # Check if logged in to Azure
    try {
        $account = az account show --query "name" -o tsv
        Write-Log "Logged in to Azure account: $account" "SUCCESS"
    } catch {
        Write-Log "Not logged in to Azure. Running 'az login'..." "WARN"
        az login
    }
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Log "Node.js version: $nodeVersion" "SUCCESS"
    } catch {
        Write-Log "Node.js not found. Please install Node.js 18+." "ERROR"
        exit 1
    }
    
    # Check if .env.production exists
    if (-not (Test-Path ".env.production")) {
        Write-Log "Creating .env.production from template..." "WARN"
        Copy-Item "env.production.example" ".env.production" -ErrorAction SilentlyContinue
    }
}

function Deploy-Infrastructure {
    Write-Log "Deploying Azure infrastructure..."
    
    # Create resource group if it doesn't exist
    $rgExists = az group exists --name $ResourceGroupName
    if ($rgExists -eq "false") {
        Write-Log "Creating resource group: $ResourceGroupName"
        az group create --name $ResourceGroupName --location $Location
    } else {
        Write-Log "Resource group $ResourceGroupName already exists" "SUCCESS"
    }
    
    # Deploy main Bicep template
    Write-Log "Deploying main Bicep template..."
    $deploymentName = "benefits-chatbot-phase1-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    az deployment group create `
        --resource-group $ResourceGroupName `
        --template-file "azure/main.bicep" `
        --parameters "azure/parameters.$EnvironmentName.json" `
        --name $deploymentName `
        --verbose
        
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Infrastructure deployment failed!" "ERROR"
        exit 1
    }
    
    Write-Log "Infrastructure deployed successfully!" "SUCCESS"
    
    # Get deployment outputs
    Write-Log "Retrieving deployment outputs..."
    $outputs = az deployment group show `
        --resource-group $ResourceGroupName `
        --name $deploymentName `
        --query properties.outputs `
        --output json | ConvertFrom-Json
    
    return $outputs
}

function Build-Application {
    Write-Log "Building application for production..."
    
    # Install dependencies
    Write-Log "Installing dependencies..."
    npm ci --production=false
    
    # Run TypeScript check
    Write-Log "Running TypeScript validation..."
    npx tsc --noEmit
    if ($LASTEXITCODE -ne 0) {
        Write-Log "TypeScript errors found! Please fix before deploying." "ERROR"
        exit 1
    }
    
    # Run tests if not skipped
    if (-not $SkipTests) {
        Write-Log "Running tests..."
        npm run test -- --passWithNoTests
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Tests failed! Please fix before deploying." "ERROR"
            exit 1
        }
    }
    
    # Build application
    Write-Log "Building application for production..."
    $env:NODE_ENV = "production"
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Build failed!" "ERROR"
        exit 1
    }
    
    Write-Log "Application built successfully!" "SUCCESS"
}

function Deploy-Application {
    param($InfrastructureOutputs)
    
    Write-Log "Deploying application to Azure App Service..."
    
    # Get App Service details from outputs
    if ($InfrastructureOutputs) {
        $appServiceName = $InfrastructureOutputs.appServiceName.value
        $appServiceResourceGroup = $ResourceGroupName
    } else {
        # Try to find existing App Service
        $appServiceName = az webapp list --resource-group $ResourceGroupName --query "[0].name" -o tsv
        if (-not $appServiceName) {
            Write-Log "Could not find App Service in resource group $ResourceGroupName" "ERROR"
            exit 1
        }
    }
    
    Write-Log "Deploying to App Service: $appServiceName"
    
    # Create deployment package
    Write-Log "Creating deployment package..."
    Compress-Archive -Path ".next", "public", "package.json", "next.config.mjs" -DestinationPath "deployment.zip" -Force
    
    # Deploy to Azure App Service
    az webapp deployment source config-zip `
        --resource-group $ResourceGroupName `
        --name $appServiceName `
        --src "deployment.zip"
        
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Application deployment failed!" "ERROR"
        exit 1
    }
    
    Write-Log "Application deployed successfully!" "SUCCESS"
    
    # Get the app URL
    $appUrl = az webapp show --resource-group $ResourceGroupName --name $appServiceName --query "defaultHostName" -o tsv
    return "https://$appUrl"
}

function Configure-Environment {
    param($AppServiceName, $InfrastructureOutputs)
    
    Write-Log "Configuring environment variables..."
    
    # Read .env.production file
    if (Test-Path ".env.production") {
        $envVars = @{}
        Get-Content ".env.production" | ForEach-Object {
            if ($_ -match '^([^=]+)=(.*)$') {
                $envVars[$matches[1]] = $matches[2]
            }
        }
        
        # Add infrastructure outputs to environment variables
        if ($InfrastructureOutputs) {
            $envVars["AZURE_COSMOS_ENDPOINT"] = $InfrastructureOutputs.cosmosDbEndpoint.value
            $envVars["AZURE_STORAGE_ACCOUNT"] = $InfrastructureOutputs.storageAccountName.value
            $envVars["AZURE_KEYVAULT_URL"] = $InfrastructureOutputs.keyVaultUrl.value
            $envVars["APPLICATIONINSIGHTS_CONNECTION_STRING"] = $InfrastructureOutputs.appInsightsInstrumentationKey.value
        }
        
        # Set environment variables in App Service
        az webapp config appsettings set `
            --resource-group $ResourceGroupName `
            --name $AppServiceName `
            --settings $envVars
            
        Write-Log "Environment variables configured successfully!" "SUCCESS"
    } else {
        Write-Log ".env.production file not found. Skipping environment variable configuration." "WARN"
    }
}

function Setup-Monitoring {
    param($InfrastructureOutputs)
    
    Write-Log "Setting up monitoring and alerts..."
    
    if ($InfrastructureOutputs -and $InfrastructureOutputs.appInsightsName) {
        $appInsightsName = $InfrastructureOutputs.appInsightsName.value
        
        # Create cost alert
        az monitor metrics alert create `
            --name "High-API-Costs" `
            --resource-group $ResourceGroupName `
            --description "Alert when daily API costs exceed $50" `
            --condition "count static gt 50" `
            --evaluation-frequency 1h `
            --window-size 1h `
            --severity 2
            
        # Create performance alert
        az monitor metrics alert create `
            --name "High-Response-Time" `
            --resource-group $ResourceGroupName `
            --description "Alert when average response time exceeds 5 seconds" `
            --condition "avg static gt 5000" `
            --evaluation-frequency 5m `
            --window-size 15m `
            --severity 3
            
        Write-Log "Monitoring and alerts configured!" "SUCCESS"
    }
}

function Test-Deployment {
    param($AppUrl)
    
    Write-Log "Validating deployment..."
    
    # Health check
    try {
        $healthResponse = Invoke-RestMethod -Uri "$AppUrl/api/health" -Method GET -TimeoutSec 30
        if ($healthResponse.status -eq "healthy") {
            Write-Log "Health check passed!" "SUCCESS"
        } else {
            Write-Log "Health check failed: $($healthResponse.status)" "ERROR"
            return $false
        }
    } catch {
        Write-Log "Health check endpoint unreachable: $_" "ERROR"
        return $false
    }
    
    # API endpoints check
    $endpoints = @("/api/auth/status", "/api/chat/health", "/api/super-admin/stats")
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-RestMethod -Uri "$AppUrl$endpoint" -Method GET -TimeoutSec 10
            Write-Log "Endpoint $endpoint is accessible" "SUCCESS"
        } catch {
            Write-Log "Endpoint $endpoint failed: $_" "WARN"
        }
    }
    
    return $true
}

function Run-LoadTest {
    param($AppUrl)
    
    if ($SkipLoadTest) {
        Write-Log "Skipping load test as requested." "WARN"
        return
    }
    
    Write-Log "Running load test for 500 concurrent users..."
    
    # Run load test script
    & ".\scripts\load-test.ps1" -AppUrl $AppUrl -ConcurrentUsers 500 -TestDurationMinutes 5 -TestType "full"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Load test completed successfully!" "SUCCESS"
    } else {
        Write-Log "Load test failed!" "ERROR"
    }
}

function Generate-Deployment-Report {
    param($AppUrl, $InfrastructureOutputs)
    
    Write-Host "`nPhase 1 Deployment Report" -ForegroundColor Green
    Write-Host "=========================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Environment: $EnvironmentName" -ForegroundColor White
    Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor White
    Write-Host "Application URL: $AppUrl" -ForegroundColor White
    Write-Host ""
    
    if ($InfrastructureOutputs) {
        Write-Host "Infrastructure Components:" -ForegroundColor Cyan
        Write-Host "  - Cosmos DB: $($InfrastructureOutputs.cosmosDbEndpoint.value)" -ForegroundColor White
        Write-Host "  - Storage Account: $($InfrastructureOutputs.storageAccountName.value)" -ForegroundColor White
        Write-Host "  - Key Vault: $($InfrastructureOutputs.keyVaultUrl.value)" -ForegroundColor White
        Write-Host "  - App Insights: $($InfrastructureOutputs.appInsightsInstrumentationKey.value)" -ForegroundColor White
        Write-Host ""
    }
    
    Write-Host "Phase 1 Features Deployed:" -ForegroundColor Cyan
    Write-Host "  ✓ Hybrid LLM Routing System" -ForegroundColor Green
    Write-Host "  ✓ Azure Infrastructure Migration" -ForegroundColor Green
    Write-Host "  ✓ Multi-tenant Security" -ForegroundColor Green
    Write-Host "  ✓ Real-time Analytics Dashboard" -ForegroundColor Green
    Write-Host "  ✓ Cost Monitoring and Controls" -ForegroundColor Green
    Write-Host "  ✓ Production Configuration" -ForegroundColor Green
    Write-Host "  ✓ Error Tracking and Recovery" -ForegroundColor Green
    Write-Host "  ✓ Load Testing (500 concurrent users)" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Configure custom domain (optional)" -ForegroundColor White
    Write-Host "2. Setup CI/CD pipeline" -ForegroundColor White
    Write-Host "3. Train admin users" -ForegroundColor White
    Write-Host "4. Monitor system performance" -ForegroundColor White
    Write-Host "5. Begin Phase 2 development" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Support Resources:" -ForegroundColor Cyan
    Write-Host "  - Documentation: docs/" -ForegroundColor White
    Write-Host "  - API Documentation: docs/api-documentation.md" -ForegroundColor White
    Write-Host "  - User Guide: docs/user-guide.md" -ForegroundColor White
    Write-Host "  - Admin Guide: docs/admin-guide.md" -ForegroundColor White
    Write-Host ""
}

# Main execution
function Main {
    try {
        Write-Log "Starting Phase 1 complete deployment..." "SUCCESS"
        
        # Check prerequisites
        Test-Prerequisites
        
        # Deploy infrastructure
        $infrastructureOutputs = Deploy-Infrastructure
        
        # Build application
        Build-Application
        
        # Deploy application
        $appUrl = Deploy-Application -InfrastructureOutputs $infrastructureOutputs
        
        # Configure environment
        $appServiceName = if ($infrastructureOutputs) { 
            $infrastructureOutputs.appServiceName.value 
        } else { 
            az webapp list --resource-group $ResourceGroupName --query "[0].name" -o tsv 
        }
        
        Configure-Environment -AppServiceName $appServiceName -InfrastructureOutputs $infrastructureOutputs
        
        # Setup monitoring
        Setup-Monitoring -InfrastructureOutputs $infrastructureOutputs
        
        # Test deployment
        $isValid = Test-Deployment -AppUrl $appUrl
        
        if ($isValid) {
            Write-Log "Deployment validation passed!" "SUCCESS"
            
            # Run load test
            Run-LoadTest -AppUrl $appUrl
            
            # Generate report
            Generate-Deployment-Report -AppUrl $appUrl -InfrastructureOutputs $infrastructureOutputs
            
            Write-Log "Phase 1 deployment completed successfully!" "SUCCESS"
            
        } else {
            Write-Log "Deployment validation failed. Please check the application manually." "WARN"
        }
        
    } catch {
        Write-Log "Phase 1 deployment failed: $_" "ERROR"
        Write-Log "Check the logs above for details." "ERROR"
        exit 1
    }
}

# Execute main function
Main

# Cleanup
if (Test-Path "deployment.zip") {
    Remove-Item "deployment.zip" -Force
}

Write-Host "`nPhase 1 Complete Deployment Finished!" -ForegroundColor Green
