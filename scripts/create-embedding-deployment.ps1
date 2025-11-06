# Create Azure OpenAI Embedding Deployment
# Creates the text-embedding-ada-002 deployment needed for RAG

$resourceGroup = "benefits-chatbot-project"
$openAIAccount = "amerivetopenai"
$deploymentName = "text-embedding-ada-002"
$modelName = "text-embedding-ada-002"
$modelVersion = "2"
$capacity = 120  # TPM (tokens per minute) capacity

Write-Host "`n=== Creating Azure OpenAI Embedding Deployment ===" -ForegroundColor Cyan
Write-Host "Resource Group: $resourceGroup" -ForegroundColor Yellow
Write-Host "OpenAI Account: $openAIAccount" -ForegroundColor Yellow
Write-Host "Deployment: $deploymentName" -ForegroundColor Yellow
Write-Host "Model: $modelName (version $modelVersion)" -ForegroundColor Yellow
Write-Host "Capacity: $capacity TPM`n" -ForegroundColor Yellow

# Check if deployment already exists
Write-Host "Checking if deployment exists..." -ForegroundColor Gray
$existing = az cognitiveservices account deployment show `
    --name $openAIAccount `
    --resource-group $resourceGroup `
    --deployment-name $deploymentName `
    2>$null

if ($existing) {
    Write-Host "âœ… Deployment already exists!" -ForegroundColor Green
    $existing | ConvertFrom-Json | Format-List name, properties
    exit 0
}

Write-Host "Creating deployment..." -ForegroundColor Yellow

$result = az cognitiveservices account deployment create `
    --name $openAIAccount `
    --resource-group $resourceGroup `
    --deployment-name $deploymentName `
    --model-name $modelName `
    --model-version $modelVersion `
    --model-format OpenAI `
    --sku-name "Standard" `
    --sku-capacity $capacity `
    2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment created successfully!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Deployment is being provisioned (may take 1-2 minutes)" -ForegroundColor White
    Write-Host "2. Test with: .\scripts\test-azure-search-connection.ps1" -ForegroundColor White
    Write-Host "3. Once working, test QA endpoint: POST /api/qa`n" -ForegroundColor White
} else {
    Write-Host "`n❌ Failed to create deployment" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    Write-Host "`nManual steps:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://portal.azure.com" -ForegroundColor White
    Write-Host "2. Navigate to: Azure OpenAI > amerivetopenai > Deployments" -ForegroundColor White
    Write-Host "3. Click 'Create new deployment'" -ForegroundColor White
    Write-Host "4. Select model: text-embedding-ada-002 (version 2)" -ForegroundColor White
    Write-Host "5. Deployment name: text-embedding-ada-002" -ForegroundColor White
    Write-Host "6. Capacity: 120 TPM`n" -ForegroundColor White
}
