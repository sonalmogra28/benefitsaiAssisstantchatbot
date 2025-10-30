# Azure App Service Deployment Script
# Deploys the Benefits Assistant Chatbot to Azure App Service

# --- Configuration ---
$resourceGroupName = "benefits-chatbot-project"
$appServicePlanName = "asp-benefits-chatbot"
$webAppName = "benefits-chatbot-dev"
$location = "Central US"
$nodeVersion = "18-lts"

# --- Helper Functions ---
function Write-Host-Color {
    param (
        [string]$Message,
        [string]$ForegroundColor = "White"
    )
    Write-Host $Message -ForegroundColor $ForegroundColor
}

function Check-AzureCli {
    Write-Host-Color "ðŸš€ Checking Azure CLI installation..." Cyan
    try {
        $azVersion = az --version 2>$null
        if ($azVersion) {
            Write-Host-Color "âœ… Azure CLI is installed." Green
            return $true
        } else {
            Write-Host-Color "âŒ Azure CLI is not installed. Please install it from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" Red
            return $false
        }
    } catch {
        Write-Host-Color "âŒ Error checking Azure CLI: $($_.Exception.Message)" Red
        return $false
    }
}

function Create-AppServicePlan {
    Write-Host-Color "ðŸ“‹ Creating App Service Plan..." Cyan
    try {
        az appservice plan create `
            --name $appServicePlanName `
            --resource-group $resourceGroupName `
            --location $location `
            --sku B1 `
            --is-linux | Out-Null
        Write-Host-Color "âœ… App Service Plan '$appServicePlanName' created." Green
        return $true
    } catch {
        Write-Host-Color "âŒ Failed to create App Service Plan: $($_.Exception.Message)" Red
        return $false
    }
}

function Create-WebApp {
    Write-Host-Color "ðŸŒ Creating Web App..." Cyan
    try {
        az webapp create `
            --name $webAppName `
            --resource-group $resourceGroupName `
            --plan $appServicePlanName `
            --runtime "NODE|$nodeVersion" | Out-Null
        Write-Host-Color "âœ… Web App '$webAppName' created." Green
        return $true
    } catch {
        Write-Host-Color "âŒ Failed to create Web App: $($_.Exception.Message)" Red
        return $false
    }
}

function Configure-WebApp {
    Write-Host-Color "âš™ï¸ Configuring Web App settings..." Cyan
    try {
        # Set Node.js version
        az webapp config set `
            --name $webAppName `
            --resource-group $resourceGroupName `
            --linux-fx-version "NODE|$nodeVersion" | Out-Null

        # Configure startup command
        az webapp config set `
            --name $webAppName `
            --resource-group $resourceGroupName `
            --startup-file "npm start" | Out-Null

        # Set environment variables
        $envVars = @(
            "NODE_ENV=production",
            "NEXT_PUBLIC_APP_URL=https://$webAppName.azurewebsites.net",
            "AZURE_COSMOS_ENDPOINT=https://benefits-chatbot-cosmos-dev.documents.azure.com:443/",
            "AZURE_COSMOS_KEY=$env:AZURE_COSMOS_KEY",
            "AZURE_COSMOS_DATABASE=benefits-chatbot-db",
            "AZURE_STORAGE_ACCOUNT_NAME=benefitschatbotdev",
            "AZURE_STORAGE_ACCOUNT_KEY=$env:AZURE_STORAGE_ACCOUNT_KEY",
            "AZURE_REDIS_HOST=benefits-chatbot-redis-dev.redis.cache.windows.net",
            "AZURE_REDIS_PORT=6380",
            "AZURE_REDIS_PASSWORD=$env:AZURE_REDIS_PASSWORD",
            "REDIS_URL=$env:REDIS_URL"
        )

        foreach ($envVar in $envVars) {
            $key, $value = $envVar -split "=", 2
            az webapp config appsettings set `
                --name $webAppName `
                --resource-group $resourceGroupName `
                --settings "$key=$value" | Out-Null
        }

        Write-Host-Color "âœ… Web App configured successfully." Green
        return $true
    } catch {
        Write-Host-Color "âŒ Failed to configure Web App: $($_.Exception.Message)" Red
        return $false
    }
}

function Deploy-Application {
    Write-Host-Color "ðŸš€ Deploying application..." Cyan
    try {
        # Build the application
        Write-Host-Color "ðŸ“¦ Building Next.js application..." Yellow
        npm run build

        if ($LASTEXITCODE -ne 0) {
            throw "Build failed"
        }

        # Create deployment package
        Write-Host-Color "ðŸ“¦ Creating deployment package..." Yellow
        $deployPath = "deploy-package"
        if (Test-Path $deployPath) {
            Remove-Item -Recurse -Force $deployPath
        }
        New-Item -ItemType Directory -Path $deployPath | Out-Null

        # Copy necessary files
        Copy-Item -Path "package.json" -Destination $deployPath
        Copy-Item -Path "package-lock.json" -Destination $deployPath
        Copy-Item -Path ".next" -Destination $deployPath -Recurse
        Copy-Item -Path "public" -Destination $deployPath -Recurse
        Copy-Item -Path "app" -Destination $deployPath -Recurse
        Copy-Item -Path "components" -Destination $deployPath -Recurse
        Copy-Item -Path "lib" -Destination $deployPath -Recurse
        Copy-Item -Path "middleware.ts" -Destination $deployPath
        Copy-Item -Path "next.config.js" -Destination $deployPath
        Copy-Item -Path "tsconfig.json" -Destination $deployPath
        Copy-Item -Path "tailwind.config.ts" -Destination $deployPath
        Copy-Item -Path "postcss.config.js" -Destination $deployPath

        # Deploy using zip deployment
        Write-Host-Color "ðŸ“¤ Uploading deployment package..." Yellow
        Compress-Archive -Path "$deployPath\*" -DestinationPath "deploy.zip" -Force

        az webapp deployment source config-zip `
            --name $webAppName `
            --resource-group $resourceGroupName `
            --src "deploy.zip" | Out-Null

        # Clean up
        Remove-Item -Recurse -Force $deployPath
        Remove-Item "deploy.zip"

        Write-Host-Color "âœ… Application deployed successfully." Green
        return $true
    } catch {
        Write-Host-Color "âŒ Failed to deploy application: $($_.Exception.Message)" Red
        return $false
    }
}

function Test-Deployment {
    Write-Host-Color "ðŸ§ª Testing deployment..." Cyan
    try {
        $url = "https://$webAppName.azurewebsites.net"
        Write-Host-Color "Testing URL: $url" Yellow
        
        # Wait for deployment to be ready
        Start-Sleep -Seconds 30
        
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 30
        if ($response.StatusCode -eq 200) {
            Write-Host-Color "âœ… Deployment test successful!" Green
            Write-Host-Color "ðŸŒ Application is available at: $url" Green
            return $true
        } else {
            Write-Host-Color "âŒ Deployment test failed. Status: $($response.StatusCode)" Red
            return $false
        }
    } catch {
        Write-Host-Color "âŒ Deployment test failed: $($_.Exception.Message)" Red
        return $false
    }
}

# --- Main Script Logic ---
Write-Host-Color "ðŸš€ Starting Azure App Service Deployment..." Green
Write-Host-Color "Resource Group: $resourceGroupName" Yellow
Write-Host-Color "Web App Name: $webAppName" Yellow
Write-Host-Color "Location: $location" Yellow

if (-not (Check-AzureCli)) {
    exit 1
}

# Check if App Service Plan exists
$planExists = az appservice plan show --name $appServicePlanName --resource-group $resourceGroupName 2>$null
if (-not $planExists) {
    if (-not (Create-AppServicePlan)) {
        exit 1
    }
} else {
    Write-Host-Color "âœ… App Service Plan already exists." Green
}

# Check if Web App exists
$appExists = az webapp show --name $webAppName --resource-group $resourceGroupName 2>$null
if (-not $appExists) {
    if (-not (Create-WebApp)) {
        exit 1
    }
} else {
    Write-Host-Color "âœ… Web App already exists." Green
}

# Configure Web App
if (-not (Configure-WebApp)) {
    exit 1
}

# Deploy Application
if (-not (Deploy-Application)) {
    exit 1
}

# Test Deployment
if (-not (Test-Deployment)) {
    Write-Host-Color "âš ï¸ Deployment completed but test failed. Check the application manually." Yellow
}

Write-Host-Color "ðŸŽ‰ Azure App Service deployment completed!" Green
Write-Host-Color "ðŸŒ Application URL: https://$webAppName.azurewebsites.net" Green

