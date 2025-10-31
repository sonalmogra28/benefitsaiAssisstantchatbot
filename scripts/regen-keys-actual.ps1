# Azure Keys Regeneration Script - Corrected Resource Names
param(
    [string]$rg = "benefits-chatbot-project"
)

Write-Host "=== Azure Key Regeneration Started ===" -ForegroundColor Cyan
Write-Host "Resource Group: $rg`n" -ForegroundColor Yellow

# Cosmos DB
Write-Host "[1/5] Cosmos DB (benefits-chatbot-cosmos-dev)..." -ForegroundColor Yellow
az cosmosdb keys regenerate --name "benefits-chatbot-cosmos-dev" --resource-group $rg --key-kind primary --output none
$cosmosKeys = az cosmosdb keys list --name "benefits-chatbot-cosmos-dev" --resource-group $rg | ConvertFrom-Json
Write-Host "✓ Regenerated" -ForegroundColor Green
Write-Host "AZURE_COSMOS_CONNECTION_STRING=AccountEndpoint=https://benefits-chatbot-cosmos-dev.documents.azure.com:443/;AccountKey=$($cosmosKeys.primaryMasterKey)" -ForegroundColor White

# Search
Write-Host "`n[2/5] Azure AI Search (benefits-chatbot-search)..." -ForegroundColor Yellow
az search admin-key renew --service-name "benefits-chatbot-search" --resource-group $rg --key-kind primary --output none
$searchKeys = az search admin-key show --service-name "benefits-chatbot-search" --resource-group $rg | ConvertFrom-Json
Write-Host "✓ Regenerated" -ForegroundColor Green
Write-Host "AZURE_SEARCH_ENDPOINT=https://benefits-chatbot-search.search.windows.net" -ForegroundColor White
Write-Host "AZURE_SEARCH_API_KEY=$($searchKeys.primaryKey)" -ForegroundColor White

# Redis
Write-Host "`n[3/5] Redis Cache (benefits-chatbot-redis-dev)..." -ForegroundColor Yellow
az redis regenerate-keys --name "benefits-chatbot-redis-dev" --resource-group $rg --key-type Primary --output none
$redisKeys = az redis list-keys --name "benefits-chatbot-redis-dev" --resource-group $rg | ConvertFrom-Json
$redisHost = az redis show --name "benefits-chatbot-redis-dev" --resource-group $rg --query hostName -o tsv
Write-Host "✓ Regenerated" -ForegroundColor Green
Write-Host "REDIS_URL=rediss://:$($redisKeys.primaryKey)@${redisHost}:6380" -ForegroundColor White
Write-Host "RATE_LIMIT_REDIS_URL=rediss://:$($redisKeys.primaryKey)@${redisHost}:6380" -ForegroundColor White

# Storage
Write-Host "`n[4/5] Storage Account (benefitschatbotdev)..." -ForegroundColor Yellow
az storage account keys renew --account-name "benefitschatbotdev" --resource-group $rg --key key1 --output none
$storageKeys = az storage account keys list --account-name "benefitschatbotdev" --resource-group $rg | ConvertFrom-Json
Write-Host "✓ Regenerated" -ForegroundColor Green
Write-Host "AZURE_STORAGE_ACCOUNT=benefitschatbotdev" -ForegroundColor White
Write-Host "AZURE_STORAGE_KEY=$($storageKeys[0].value)" -ForegroundColor White
Write-Host "AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=benefitschatbotdev;AccountKey=$($storageKeys[0].value);EndpointSuffix=core.windows.net" -ForegroundColor White

# OpenAI
Write-Host "`n[5/5] Azure OpenAI (benefits-chatbot-openai2)..." -ForegroundColor Yellow
az cognitiveservices account keys regenerate --name "benefits-chatbot-openai2" --resource-group $rg --key-name key1 --output none
$openaiKeys = az cognitiveservices account keys list --name "benefits-chatbot-openai2" --resource-group $rg | ConvertFrom-Json
$openaiEndpoint = az cognitiveservices account show --name "benefits-chatbot-openai2" --resource-group $rg --query properties.endpoint -o tsv
Write-Host "✓ Regenerated" -ForegroundColor Green
Write-Host "AZURE_OPENAI_ENDPOINT=$openaiEndpoint" -ForegroundColor White
Write-Host "AZURE_OPENAI_API_KEY=$($openaiKeys.key1)" -ForegroundColor White
Write-Host "AZURE_OPENAI_API_VERSION=2024-10-01-preview" -ForegroundColor White

Write-Host "`n=== COMPLETE ===" -ForegroundColor Green
Write-Host "Copy the values above to your .env.production file" -ForegroundColor Cyan
Write-Host "DO NOT commit .env.production to git!" -ForegroundColor Red
