# Azure Resources Deployment Script
# For Benefits Assistant Chatbot
# Account: mograsonal10@gmail.com

param(
    [string]$ResourceGroupName = "benefits-chatbot-rg-dev",
    [string]$Location = "East US",
    [string]$Environment = "dev"
)

Write-Host "Starting Azure Resources Deployment" -ForegroundColor Green
Write-Host "Account: mograsonal10@gmail.com" -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Cyan
Write-Host "Location: $Location" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is available
try {
    $azVersion = az --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Azure CLI not found"
    }
    Write-Host "Azure CLI is available" -ForegroundColor Green
} catch {
    Write-Host "Azure CLI not found. Please install Azure CLI first." -ForegroundColor Red
    Write-Host "Download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Yellow
    exit 1
}

# Login to Azure
Write-Host "Step 1: Logging in to Azure..." -ForegroundColor Yellow
try {
    az login --use-device-code
    Write-Host "✅ Azure login successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure login failed" -ForegroundColor Red
    exit 1
}

# Get subscription info
Write-Host "Step 2: Getting subscription information..." -ForegroundColor Yellow
try {
    $subscription = az account show --query "{id:id, name:name}" -o json | ConvertFrom-Json
    Write-Host "✅ Using subscription: $($subscription.name)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to get subscription information" -ForegroundColor Red
    exit 1
}

# Create resource group
Write-Host "Step 3: Creating Resource Group..." -ForegroundColor Yellow
try {
    $existingRG = az group show --name $ResourceGroupName --query name -o tsv 2>$null
    if (-not $existingRG) {
        az group create --name $ResourceGroupName --location $Location | Out-Null
        Write-Host "✅ Resource Group '$ResourceGroupName' created" -ForegroundColor Green
    } else {
        Write-Host "✅ Resource Group '$ResourceGroupName' already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create Resource Group" -ForegroundColor Red
    exit 1
}

# Create Cosmos DB
Write-Host "Step 4: Creating Cosmos DB..." -ForegroundColor Yellow
$cosmosDbName = "benefits-chatbot-cosmos-$Environment"
try {
    $existingCosmos = az cosmosdb show --name $cosmosDbName --resource-group $ResourceGroupName --query name -o tsv 2>$null
    if (-not $existingCosmos) {
        az cosmosdb create `
            --name $cosmosDbName `
            --resource-group $ResourceGroupName `
            --location $Location `
            --kind GlobalDocumentDB `
            --default-consistency-level Session `
            --enable-free-tier false `
            --server-version 4.0 `
            --capabilities EnableServerless | Out-Null
        Write-Host "✅ Cosmos DB '$cosmosDbName' created" -ForegroundColor Green
    } else {
        Write-Host "✅ Cosmos DB '$cosmosDbName' already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create Cosmos DB" -ForegroundColor Red
}

# Create Storage Account
Write-Host "Step 5: Creating Storage Account..." -ForegroundColor Yellow
$storageAccountName = "benefitschatbot$Environment"
try {
    $existingStorage = az storage account show --name $storageAccountName --resource-group $ResourceGroupName --query name -o tsv 2>$null
    if (-not $existingStorage) {
        az storage account create `
            --name $storageAccountName `
            --resource-group $ResourceGroupName `
            --location $Location `
            --sku Standard_LRS `
            --kind StorageV2 `
            --access-tier Hot | Out-Null
        Write-Host "✅ Storage Account '$storageAccountName' created" -ForegroundColor Green
    } else {
        Write-Host "✅ Storage Account '$storageAccountName' already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create Storage Account" -ForegroundColor Red
}

# Create Redis Cache
Write-Host "Step 6: Creating Redis Cache..." -ForegroundColor Yellow
$redisName = "benefits-chatbot-redis-$Environment"
try {
    $existingRedis = az redis show --name $redisName --resource-group $ResourceGroupName --query name -o tsv 2>$null
    if (-not $existingRedis) {
        az redis create `
            --name $redisName `
            --resource-group $ResourceGroupName `
            --location $Location `
            --sku Basic `
            --vm-size C0 | Out-Null
        Write-Host "✅ Redis Cache '$redisName' created" -ForegroundColor Green
    } else {
        Write-Host "✅ Redis Cache '$redisName' already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create Redis Cache" -ForegroundColor Red
}

# Create Application Insights
Write-Host "Step 7: Creating Application Insights..." -ForegroundColor Yellow
$appInsightsName = "benefits-chatbot-insights-$Environment"
try {
    $existingAppInsights = az monitor app-insights show --name $appInsightsName --resource-group $ResourceGroupName --query name -o tsv 2>$null
    if (-not $existingAppInsights) {
        az monitor app-insights create `
            --name $appInsightsName `
            --resource-group $ResourceGroupName `
            --location $Location `
            --kind web | Out-Null
        Write-Host "✅ Application Insights '$appInsightsName' created" -ForegroundColor Green
    } else {
        Write-Host "✅ Application Insights '$appInsightsName' already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create Application Insights" -ForegroundColor Red
}

# Create Key Vault
Write-Host "Step 8: Creating Key Vault..." -ForegroundColor Yellow
$keyVaultName = "benefits-chatbot-vault-$Environment"
try {
    $existingKeyVault = az keyvault show --name $keyVaultName --resource-group $ResourceGroupName --query name -o tsv 2>$null
    if (-not $existingKeyVault) {
        az keyvault create `
            --name $keyVaultName `
            --resource-group $ResourceGroupName `
            --location $Location `
            --sku Standard | Out-Null
        Write-Host "✅ Key Vault '$keyVaultName' created" -ForegroundColor Green
    } else {
        Write-Host "✅ Key Vault '$keyVaultName' already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create Key Vault" -ForegroundColor Red
}

# Create App Service Plan
Write-Host "Step 9: Creating App Service Plan..." -ForegroundColor Yellow
$appServicePlanName = "benefits-chatbot-plan-$Environment"
try {
    $existingPlan = az appservice plan show --name $appServicePlanName --resource-group $ResourceGroupName --query name -o tsv 2>$null
    if (-not $existingPlan) {
        az appservice plan create `
            --name $appServicePlanName `
            --resource-group $ResourceGroupName `
            --location $Location `
            --sku B1 `
            --is-linux | Out-Null
        Write-Host "✅ App Service Plan '$appServicePlanName' created" -ForegroundColor Green
    } else {
        Write-Host "✅ App Service Plan '$appServicePlanName' already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create App Service Plan" -ForegroundColor Red
}

# Create Web App
Write-Host "Step 10: Creating Web App..." -ForegroundColor Yellow
$webAppName = "benefits-chatbot-$Environment"
try {
    $existingWebApp = az webapp show --name $webAppName --resource-group $ResourceGroupName --query name -o tsv 2>$null
    if (-not $existingWebApp) {
        az webapp create `
            --name $webAppName `
            --resource-group $ResourceGroupName `
            --plan $appServicePlanName `
            --runtime "NODE:18-lts" | Out-Null
        Write-Host "✅ Web App '$webAppName' created" -ForegroundColor Green
    } else {
        Write-Host "✅ Web App '$webAppName' already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create Web App" -ForegroundColor Red
}

# Collect connection information
Write-Host ""
Write-Host "COLLECTING CONNECTION INFORMATION" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Cosmos DB
Write-Host "Cosmos DB:" -ForegroundColor Yellow
$cosmosEndpoint = az cosmosdb show --name $cosmosDbName --resource-group $ResourceGroupName --query documentEndpoint -o tsv
$cosmosKey = az cosmosdb keys list --name $cosmosDbName --resource-group $ResourceGroupName --query primaryMasterKey -o tsv
Write-Host "  Endpoint: $cosmosEndpoint"
Write-Host "  Key: $cosmosKey"

# Storage Account
Write-Host "Storage Account:" -ForegroundColor Yellow
$storageKey = az storage account keys list --name $storageAccountName --resource-group $ResourceGroupName --query "[0].value" -o tsv
$storageConnectionString = az storage account show-connection-string --name $storageAccountName --resource-group $ResourceGroupName --query connectionString -o tsv
Write-Host "  Connection String: $storageConnectionString"

# Redis Cache
Write-Host "Redis Cache:" -ForegroundColor Yellow
$redisHost = az redis show --name $redisName --resource-group $ResourceGroupName --query hostName -o tsv
$redisPort = az redis show --name $redisName --resource-group $ResourceGroupName --query port -o tsv
$redisKey = az redis list-keys --name $redisName --resource-group $ResourceGroupName --query primaryKey -o tsv
Write-Host "  Host: $redisHost"
Write-Host "  Port: $redisPort"
Write-Host "  Key: $redisKey"

# Application Insights
Write-Host "Application Insights:" -ForegroundColor Yellow
$appInsightsConnectionString = az monitor app-insights show --name $appInsightsName --resource-group $ResourceGroupName --query connectionString -o tsv
Write-Host "  Connection String: $appInsightsConnectionString"

# Key Vault
Write-Host "Key Vault:" -ForegroundColor Yellow
$keyVaultUri = az keyvault show --name $keyVaultName --resource-group $ResourceGroupName --query properties.vaultUri -o tsv
Write-Host "  URI: $keyVaultUri"

Write-Host ""
Write-Host "✅ Azure resources deployment completed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update your .env.local file with the connection strings above" -ForegroundColor White
Write-Host "2. Create Cosmos DB containers using the Azure Portal" -ForegroundColor White
Write-Host "3. Create Storage containers using the Azure Portal" -ForegroundColor White
Write-Host "4. Configure Azure AD B2C following the setup guide" -ForegroundColor White
Write-Host "5. Deploy your application to the Web App" -ForegroundColor White

