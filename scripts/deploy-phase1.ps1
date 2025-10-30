# Phase 1 Production Deployment Script
# Complete deployment for Benefits Assistant Phase 1

param(
    [Parameter(Mandatory = $true)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory = $false)]
    [string]$ResourceGroup = "benefits-assistant-rg",
    
    [Parameter(Mandatory = $false)]
    [string]$Location = "East US"
)

Write-Host "🚀 Starting Phase 1 Production Deployment" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor Yellow
Write-Host "Location: $Location" -ForegroundColor Yellow

# Step 1: Validate Environment
Write-Host "`n📋 Step 1: Validating Environment Variables" -ForegroundColor Cyan
$requiredVars = @(
    "AZURE_COSMOS_ENDPOINT",
    "AZURE_COSMOS_KEY", 
    "AZURE_STORAGE_CONNECTION_STRING",
    "AZURE_OPENAI_ENDPOINT",
    "AZURE_OPENAI_API_KEY",
    "AZURE_AD_B2C_TENANT_ID",
    "AZURE_AD_B2C_CLIENT_ID",
    "AZURE_AD_B2C_CLIENT_SECRET",
    "JWT_SECRET",
    "APPLICATIONINSIGHTS_CONNECTION_STRING"
)

$missingVars = @()
foreach ($var in $requiredVars) {
    if (-not (Get-Item "env:$var" -ErrorAction SilentlyContinue)) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
    $missingVars | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}

Write-Host "✅ All required environment variables present" -ForegroundColor Green

# Step 2: Build Application
Write-Host "`n🔨 Step 2: Building Application" -ForegroundColor Cyan
try {
    npm run pre-deploy
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
    Write-Host "✅ Application built successfully" -ForegroundColor Green
}
catch {
    Write-Host "❌ Build failed: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Deploy Azure Resources
Write-Host "`n☁️ Step 3: Deploying Azure Resources" -ForegroundColor Cyan
try {
    # Deploy using Bicep templates
    az deployment group create `
        --resource-group $ResourceGroup `
        --template-file azure/main.bicep `
        --parameters environment=$Environment location=$Location `
        --verbose
    
    if ($LASTEXITCODE -ne 0) {
        throw "Azure deployment failed"
    }
    Write-Host "✅ Azure resources deployed successfully" -ForegroundColor Green
}
catch {
    Write-Host "❌ Azure deployment failed: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Deploy Application
Write-Host "`n🚀 Step 4: Deploying Application" -ForegroundColor Cyan
try {
    # Deploy to Azure Static Web Apps
    az staticwebapp deploy `
        --name "benefits-assistant-$Environment" `
        --resource-group $ResourceGroup `
        --source-location "." `
        --app-location "." `
        --output-location ".next" `
        --verbose
    
    if ($LASTEXITCODE -ne 0) {
        throw "Application deployment failed"
    }
    Write-Host "✅ Application deployed successfully" -ForegroundColor Green
}
catch {
    Write-Host "❌ Application deployment failed: $_" -ForegroundColor Red
    exit 1
}

# Step 5: Run Health Checks
Write-Host "`n🏥 Step 5: Running Health Checks" -ForegroundColor Cyan
try {
    $appUrl = "https://benefits-assistant-$Environment.azurestaticapps.net"
    
    # Test main endpoints
    $endpoints = @(
        "/api/health",
        "/api/super-admin/stats"
    )
    
    foreach ($endpoint in $endpoints) {
        $url = "$appUrl$endpoint"
        Write-Host "Testing: $url" -ForegroundColor Yellow
        
        $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 30
        if ($response.StatusCode -ne 200) {
            throw "Health check failed for $endpoint"
        }
    }
    
    Write-Host "✅ All health checks passed" -ForegroundColor Green
}
catch {
    Write-Host "❌ Health checks failed: $_" -ForegroundColor Red
    exit 1
}

# Step 6: Final Validation
Write-Host "`n✅ Step 6: Final Validation" -ForegroundColor Cyan
Write-Host "Phase 1 Deployment Complete!" -ForegroundColor Green
Write-Host "`n📊 Deployment Summary:" -ForegroundColor Yellow
Write-Host "  Environment: $Environment" -ForegroundColor White
Write-Host "  Resource Group: $ResourceGroup" -ForegroundColor White
Write-Host "  Application URL: https://benefits-assistant-$Environment.azurestaticapps.net" -ForegroundColor White
Write-Host "  Admin URL: https://benefits-assistant-$Environment.azurestaticapps.net/admin" -ForegroundColor White
Write-Host "  Super Admin URL: https://benefits-assistant-$Environment.azurestaticapps.net/super-admin" -ForegroundColor White

Write-Host "`n🎉 Phase 1 is ready for handover!" -ForegroundColor Green
