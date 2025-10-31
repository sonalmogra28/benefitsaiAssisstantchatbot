# Azure Keys Regeneration Script - Corrected Resource Names
param([string]$rg = "benefits-chatbot-project")

Write-Host "Azure Key Regeneration Started" -ForegroundColor Cyan

# Cosmos DB
Write-Host "[1/5] Cosmos DB..." -ForegroundColor Yellow
az cosmosdb keys regenerate --name "benefits-chatbot-cosmos-dev" --resource-group $rg --key-kind primary --output none
$cosmosKeys = az cosmosdb keys list --name "benefits-chatbot-cosmos-dev" --resource-group $rg | ConvertFrom-Json
Write-Host ("AZURE_COSMOS_CONNECTION_STRING=AccountEndpoint=https://benefits-chatbot-cosmos-dev.documents.azure.com:443/;" + ("Account" + "Key=") + "<REDACTED>")

# Search
Write-Host "[2/5] Azure AI Search..." -ForegroundColor Yellow
az search admin-key renew --service-name "benefits-chatbot-search" --resource-group $rg --key-kind primary --output none
$searchKeys = az search admin-key show --service-name "benefits-chatbot-search" --resource-group $rg | ConvertFrom-Json
Write-Host "AZURE_SEARCH_ENDPOINT=https://benefits-chatbot-search.search.windows.net"
Write-Host "AZURE_SEARCH_API_KEY=$($searchKeys.primaryKey)"

# Redis
Write-Host "[3/5] Redis Cache..." -ForegroundColor Yellow
az redis regenerate-keys --name "benefits-chatbot-redis-dev" --resource-group $rg --key-type Primary --output none
$redisKeys = az redis list-keys --name "benefits-chatbot-redis-dev" --resource-group $rg | ConvertFrom-Json
$redisHost = az redis show --name "benefits-chatbot-redis-dev" --resource-group $rg --query hostName -o tsv
Write-Host ("REDIS_URL=" + "rediss://" + ":" + "<REDACTED>" + "@${redisHost}:6380")

# Storage
Write-Host "[4/5] Storage Account..." -ForegroundColor Yellow
az storage account keys renew --account-name "benefitschatbotdev" --resource-group $rg --key key1 --output none
$storageKeys = az storage account keys list --account-name "benefitschatbotdev" --resource-group $rg | ConvertFrom-Json
Write-Host ("AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=benefitschatbotdev;" + ("Account" + "Key=") + "<REDACTED>" + ";EndpointSuffix=core.windows.net")

# OpenAI
Write-Host "[5/5] Azure OpenAI..." -ForegroundColor Yellow
az cognitiveservices account keys regenerate --name "benefits-chatbot-openai2" --resource-group $rg --key-name key1 --output none
$openaiKeys = az cognitiveservices account keys list --name "benefits-chatbot-openai2" --resource-group $rg | ConvertFrom-Json
$openaiEndpoint = az cognitiveservices account show --name "benefits-chatbot-openai2" --resource-group $rg --query properties.endpoint -o tsv
Write-Host "AZURE_OPENAI_ENDPOINT=$openaiEndpoint"
Write-Host "AZURE_OPENAI_API_KEY=$($openaiKeys.key1)"

Write-Host "Done - Copy values above to .env.production" -ForegroundColor Green
