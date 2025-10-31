# Azure Keys Regeneration Script
param(
    [string]$rg = "benefits-ai-rg",
    [string]$prefix = "benefitsai"
)

Write-Host "Azure Key Regeneration Started" -ForegroundColor Cyan

# Cosmos DB
Write-Host "[1/5] Cosmos DB..." -ForegroundColor Yellow
az cosmosdb keys regenerate --name "${prefix}-cosmos" --resource-group $rg --key-kind primary --output none
$cosmosKeys = az cosmosdb keys list --name "${prefix}-cosmos" --resource-group $rg | ConvertFrom-Json
Write-Host ("Cosmos Connection: AccountEndpoint=https://${prefix}-cosmos.documents.azure.com:443/;" + ("Account" + "Key=") + "<REDACTED>")

# Search
Write-Host "[2/5] Azure AI Search..." -ForegroundColor Yellow
az search admin-key renew --service-name "${prefix}-search" --resource-group $rg --key-kind primary --output none
$searchKeys = az search admin-key show --service-name "${prefix}-search" --resource-group $rg | ConvertFrom-Json
Write-Host "Search Endpoint: https://${prefix}-search.search.windows.net"
Write-Host "Search Key: $($searchKeys.primaryKey)"

# Redis
Write-Host "[3/5] Redis Cache..." -ForegroundColor Yellow
az redis regenerate-keys --name "${prefix}-redis" --resource-group $rg --key-type Primary --output none
$redisKeys = az redis list-keys --name "${prefix}-redis" --resource-group $rg | ConvertFrom-Json
$redisHost = az redis show --name "${prefix}-redis" --resource-group $rg --query hostName -o tsv
Write-Host ("Redis URL: " + "rediss://" + ":" + "<REDACTED>" + "@${redisHost}:6380")

# Storage
Write-Host "[4/5] Storage Account..." -ForegroundColor Yellow
az storage account keys renew --account-name "${prefix}storage" --resource-group $rg --key primary --output none
$storageKeys = az storage account keys list --account-name "${prefix}storage" --resource-group $rg | ConvertFrom-Json
Write-Host ("Storage Connection: DefaultEndpointsProtocol=https;AccountName=${prefix}storage;" + ("Account" + "Key=") + "<REDACTED>" + ";EndpointSuffix=core.windows.net")

# OpenAI
Write-Host "[5/5] Azure OpenAI..." -ForegroundColor Yellow
az cognitiveservices account keys regenerate --name "${prefix}-openai" --resource-group $rg --key-name key1 --output none
$openaiKeys = az cognitiveservices account keys list --name "${prefix}-openai" --resource-group $rg | ConvertFrom-Json
$openaiEndpoint = az cognitiveservices account show --name "${prefix}-openai" --resource-group $rg --query properties.endpoint -o tsv
Write-Host "OpenAI Endpoint: $openaiEndpoint"
Write-Host "OpenAI Key: $($openaiKeys.key1)"

Write-Host "Done! Copy values above to .env.production" -ForegroundColor Green
