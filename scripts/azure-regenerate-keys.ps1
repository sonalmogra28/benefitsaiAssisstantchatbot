# ============================================================================
# Azure Infrastructure - Regenerate All Keys and Endpoints
# Bootstrap Step 3: Azure Infrastructure Setup
# ============================================================================
# Purpose: Regenerate all Azure service keys, endpoints, and connection strings
# Usage: Run this script after Step 2 build validation passes
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "benefits-chatbot-rg-dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Azure Infrastructure Key Regeneration - Bootstrap Step 3" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Resource naming convention
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$cosmosAccountName = "benefits-chatbot-cosmos-$Environment"
$redisName = "benefits-chatbot-redis-$Environment"
$searchName = "benefits-chatbot-search-$Environment"
$openaiName = "benefits-chatbot-openai-$Environment"
$storageAccountName = "benefitschatbot$Environment".Replace("-", "").Substring(0, [Math]::Min(24, "benefitschatbot$Environment".Replace("-", "").Length))

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Resource Group: $ResourceGroupName" -ForegroundColor White
Write-Host "  Location: $Location" -ForegroundColor White
Write-Host "  Environment: $Environment" -ForegroundColor White
Write-Host ""

# ============================================================================
# Step 1: Verify Azure CLI is logged in
# ============================================================================
Write-Host "[1/6] Checking Azure CLI authentication..." -ForegroundColor Cyan
try {
    $account = az account show 2>$null | ConvertFrom-Json
    if ($null -eq $account) {
        Write-Host "ERROR: Not logged in to Azure CLI" -ForegroundColor Red
        Write-Host "Run: az login" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "  ✓ Logged in as: $($account.user.name)" -ForegroundColor Green
    Write-Host "  ✓ Subscription: $($account.name) ($($account.id))" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Azure CLI not found or not configured" -ForegroundColor Red
    Write-Host "Install Azure CLI: https://aka.ms/installazurecliwindows" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# ============================================================================
# Step 2: Verify Resource Group exists
# ============================================================================
Write-Host "[2/6] Checking Resource Group..." -ForegroundColor Cyan
$rgExists = az group exists --name $ResourceGroupName
if ($rgExists -eq "false") {
    Write-Host "  ! Resource Group '$ResourceGroupName' does not exist" -ForegroundColor Yellow
    Write-Host "  Creating Resource Group..." -ForegroundColor Yellow
    az group create --name $ResourceGroupName --location $Location --output none
    Write-Host "  ✓ Resource Group created" -ForegroundColor Green
} else {
    Write-Host "  ✓ Resource Group exists" -ForegroundColor Green
}
Write-Host ""

# ============================================================================
# Step 3: Regenerate Cosmos DB Keys
# ============================================================================
Write-Host "[3/6] Regenerating Cosmos DB keys..." -ForegroundColor Cyan
try {
    # Check if Cosmos account exists
    $cosmosExists = az cosmosdb check-name-exists --name $cosmosAccountName 2>$null
    
    if ($cosmosExists -eq "false") {
        Write-Host "  ! Cosmos DB account '$cosmosAccountName' does not exist" -ForegroundColor Yellow
        Write-Host "  Creating Cosmos DB account (this takes 5-10 minutes)..." -ForegroundColor Yellow
        
        az cosmosdb create `
            --name $cosmosAccountName `
            --resource-group $ResourceGroupName `
            --locations regionName=$Location failoverPriority=0 isZoneRedundant=False `
            --default-consistency-level Session `
            --enable-free-tier false `
            --output none
        
        Write-Host "  ✓ Cosmos DB account created" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Cosmos DB account exists" -ForegroundColor Green
    }
    
    # Regenerate primary key
    Write-Host "  Regenerating primary key..." -ForegroundColor Yellow
    az cosmosdb keys regenerate `
        --name $cosmosAccountName `
        --resource-group $ResourceGroupName `
        --key-kind primary `
        --output none
    
    # Get connection string
    $cosmosConnString = az cosmosdb keys list `
        --name $cosmosAccountName `
        --resource-group $ResourceGroupName `
        --type connection-strings `
        --query "connectionStrings[?description=='Primary SQL Connection String'].connectionString" `
        --output tsv
    
    Write-Host "  ✓ Cosmos DB primary key regenerated" -ForegroundColor Green
    Write-Host "  Endpoint: https://$cosmosAccountName.documents.azure.com:443/" -ForegroundColor White
} catch {
    Write-Host "  ✗ ERROR: Failed to regenerate Cosmos DB keys: $_" -ForegroundColor Red
}
Write-Host ""

# ============================================================================
# Step 4: Regenerate Redis Cache Keys
# ============================================================================
Write-Host "[4/6] Regenerating Redis Cache keys..." -ForegroundColor Cyan
try {
    # Check if Redis exists
    $redisList = az redis list --resource-group $ResourceGroupName --query "[?name=='$redisName']" 2>$null | ConvertFrom-Json
    
    if ($null -eq $redisList -or $redisList.Count -eq 0) {
        Write-Host "  ! Redis Cache '$redisName' does not exist" -ForegroundColor Yellow
        Write-Host "  Creating Redis Cache (this takes 15-20 minutes)..." -ForegroundColor Yellow
        
        az redis create `
            --name $redisName `
            --resource-group $ResourceGroupName `
            --location $Location `
            --sku Basic `
            --vm-size c0 `
            --enable-non-ssl-port false `
            --minimum-tls-version 1.2 `
            --output none
        
        Write-Host "  ✓ Redis Cache created" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Redis Cache exists" -ForegroundColor Green
    }
    
    # Regenerate primary key
    Write-Host "  Regenerating primary key..." -ForegroundColor Yellow
    az redis regenerate-keys `
        --name $redisName `
        --resource-group $ResourceGroupName `
        --key-type Primary `
        --output none
    
    # Get connection details
    $redisKeys = az redis list-keys --name $redisName --resource-group $ResourceGroupName | ConvertFrom-Json
    $redisHost = az redis show --name $redisName --resource-group $ResourceGroupName --query "hostName" --output tsv
    $redisPort = az redis show --name $redisName --resource-group $ResourceGroupName --query "sslPort" --output tsv
    
    $redisUrl = "rediss://:$($redisKeys.primaryKey)@${redisHost}:${redisPort}"
    
    Write-Host "  ✓ Redis Cache primary key regenerated" -ForegroundColor Green
    Write-Host "  Endpoint: $redisHost`:$redisPort" -ForegroundColor White
} catch {
    Write-Host "  ✗ ERROR: Failed to regenerate Redis keys: $_" -ForegroundColor Red
}
Write-Host ""

# ============================================================================
# Step 5: Regenerate Azure Search Keys
# ============================================================================
Write-Host "[5/6] Regenerating Azure Search admin keys..." -ForegroundColor Cyan
try {
    # Check if Search service exists
    $searchList = az search service list --resource-group $ResourceGroupName --query "[?name=='$searchName']" 2>$null | ConvertFrom-Json
    
    if ($null -eq $searchList -or $searchList.Count -eq 0) {
        Write-Host "  ! Azure Search service '$searchName' does not exist" -ForegroundColor Yellow
        Write-Host "  Creating Azure Search service..." -ForegroundColor Yellow
        
        az search service create `
            --name $searchName `
            --resource-group $ResourceGroupName `
            --location $Location `
            --sku free `
            --output none
        
        Write-Host "  ✓ Azure Search service created" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Azure Search service exists" -ForegroundColor Green
    }
    
    # Get admin key (cannot regenerate on free tier, just retrieve)
    $searchAdminKey = az search admin-key show `
        --service-name $searchName `
        --resource-group $ResourceGroupName `
        --query "primaryKey" `
        --output tsv
    
    $searchEndpoint = "https://$searchName.search.windows.net"
    
    Write-Host "  ✓ Azure Search admin key retrieved" -ForegroundColor Green
    Write-Host "  Endpoint: $searchEndpoint" -ForegroundColor White
    Write-Host "  Note: Free tier does not support key regeneration" -ForegroundColor Yellow
} catch {
    Write-Host "  ✗ ERROR: Failed to retrieve Azure Search keys: $_" -ForegroundColor Red
}
Write-Host ""

# ============================================================================
# Step 6: Regenerate Storage Account Keys
# ============================================================================
Write-Host "[6/6] Regenerating Storage Account keys..." -ForegroundColor Cyan
try {
    # Check if Storage account exists
    $storageExists = az storage account check-name --name $storageAccountName --query "nameAvailable" --output tsv 2>$null
    
    if ($storageExists -eq "true") {
        Write-Host "  ! Storage account '$storageAccountName' does not exist" -ForegroundColor Yellow
        Write-Host "  Creating Storage account..." -ForegroundColor Yellow
        
        az storage account create `
            --name $storageAccountName `
            --resource-group $ResourceGroupName `
            --location $Location `
            --sku Standard_LRS `
            --kind StorageV2 `
            --allow-blob-public-access false `
            --min-tls-version TLS1_2 `
            --output none
        
        Write-Host "  ✓ Storage account created" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Storage account exists" -ForegroundColor Green
    }
    
    # Regenerate key1
    Write-Host "  Regenerating key1..." -ForegroundColor Yellow
    az storage account keys renew `
        --account-name $storageAccountName `
        --resource-group $ResourceGroupName `
        --key key1 `
        --output none
    
    # Get connection string
    $storageConnString = az storage account show-connection-string `
        --name $storageAccountName `
        --resource-group $ResourceGroupName `
        --query "connectionString" `
        --output tsv
    
    Write-Host "  ✓ Storage account key1 regenerated" -ForegroundColor Green
} catch {
    Write-Host "  ✗ ERROR: Failed to regenerate Storage keys: $_" -ForegroundColor Red
}
Write-Host ""

# ============================================================================
# Step 7: Generate .env.local file
# ============================================================================
Write-Host "[7/7] Generating .env.local file..." -ForegroundColor Cyan

$envContent = @"
# ============================================================================
# Azure Infrastructure - Bootstrap Step 3
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# ============================================================================
# WARNING: This file contains secrets. DO NOT commit to git.
# Add .env.local to .gitignore
# ============================================================================

# Azure Cosmos DB
AZURE_COSMOS_CONNECTION_STRING="$cosmosConnString"
AZURE_COSMOS_ENDPOINT="https://$cosmosAccountName.documents.azure.com:443/"
AZURE_COSMOS_DATABASE="BenefitsDB"

# Azure Redis Cache
REDIS_URL="$redisUrl"
RATE_LIMIT_REDIS_URL="$redisUrl"

# Azure Cognitive Search
AZURE_SEARCH_ENDPOINT="$searchEndpoint"
AZURE_SEARCH_KEY="$searchAdminKey"
AZURE_SEARCH_INDEX_NAME="benefits-documents"

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING="$storageConnString"
AZURE_STORAGE_ACCOUNT_NAME="$storageAccountName"

# Azure OpenAI (Manual: Create in portal if needed)
# AZURE_OPENAI_ENDPOINT="https://$openaiName.openai.azure.com/"
# AZURE_OPENAI_KEY="<get-from-portal>"
# AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4"

# NextAuth Configuration
NEXTAUTH_SECRET="$(New-Guid)"
NEXTAUTH_URL="http://localhost:8080"

# Application Settings
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:8080"
"@

$envContent | Out-File -FilePath ".env.local" -Encoding UTF8 -Force

Write-Host "  ✓ .env.local file created" -ForegroundColor Green
Write-Host ""

# ============================================================================
# Summary
# ============================================================================
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Key Regeneration Summary" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Cosmos DB:" -ForegroundColor Green
Write-Host "  Account: $cosmosAccountName" -ForegroundColor White
Write-Host "  Endpoint: https://$cosmosAccountName.documents.azure.com:443/" -ForegroundColor White
Write-Host ""
Write-Host "✓ Redis Cache:" -ForegroundColor Green
Write-Host "  Name: $redisName" -ForegroundColor White
Write-Host "  Endpoint: $redisHost`:$redisPort" -ForegroundColor White
Write-Host ""
Write-Host "✓ Azure Search:" -ForegroundColor Green
Write-Host "  Name: $searchName" -ForegroundColor White
Write-Host "  Endpoint: $searchEndpoint" -ForegroundColor White
Write-Host ""
Write-Host "✓ Storage Account:" -ForegroundColor Green
Write-Host "  Name: $storageAccountName" -ForegroundColor White
Write-Host ""
Write-Host "⚠ Manual Steps Required:" -ForegroundColor Yellow
Write-Host "  1. Azure OpenAI requires manual setup in Azure Portal" -ForegroundColor White
Write-Host "     - Portal: https://portal.azure.com" -ForegroundColor White
Write-Host "     - Create Azure OpenAI resource: $openaiName" -ForegroundColor White
Write-Host "     - Deploy model: gpt-4 or gpt-35-turbo" -ForegroundColor White
Write-Host "     - Update .env.local with endpoint and key" -ForegroundColor White
Write-Host ""
Write-Host "  2. Verify .env.local file and update any missing values" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Review .env.local file" -ForegroundColor White
Write-Host "  2. Test runtime: npm run dev" -ForegroundColor White
Write-Host "  3. Verify Azure service connections" -ForegroundColor White
Write-Host "  4. Proceed to Bootstrap Step 4 (if defined)" -ForegroundColor White
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
