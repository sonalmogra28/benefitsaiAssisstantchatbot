# Update Vercel Environment Variables with Azure Production Values
# Google Principal Engineer Approach - Production Configuration

Write-Host "🔧 Updating Vercel Environment Variables with Azure Production Values..." -ForegroundColor Green

# Azure Cosmos DB Configuration
Write-Host "Setting Azure Cosmos DB configuration..." -ForegroundColor Yellow
vercel env rm AZURE_COSMOS_ENDPOINT --yes
vercel env add AZURE_COSMOS_ENDPOINT production
# Enter: https://benefits-chatbot-cosmos-dev.documents.azure.com:443/

vercel env rm AZURE_COSMOS_KEY --yes  
vercel env add AZURE_COSMOS_KEY production
# Enter: $env:AZURE_COSMOS_KEY

vercel env rm COSMOS_DB_ENDPOINT --yes
vercel env add COSMOS_DB_ENDPOINT production
# Enter: https://benefits-chatbot-cosmos-dev.documents.azure.com:443/

vercel env rm COSMOS_DB_KEY --yes
vercel env add COSMOS_DB_KEY production
# Enter: $env:AZURE_COSMOS_KEY

# Azure Storage Configuration
Write-Host "Setting Azure Storage configuration..." -ForegroundColor Yellow
vercel env rm AZURE_STORAGE_CONNECTION_STRING --yes
vercel env add AZURE_STORAGE_CONNECTION_STRING production
# Enter: $env:AZURE_STORAGE_CONNECTION_STRING

# Azure Redis Configuration
Write-Host "Setting Azure Redis configuration..." -ForegroundColor Yellow
vercel env rm REDIS_URL --yes
vercel env add REDIS_URL production
# Enter: $env:REDIS_URL

vercel env rm RATE_LIMIT_REDIS_URL --yes
vercel env add RATE_LIMIT_REDIS_URL production
# Enter: $env:REDIS_URL

# Azure OpenAI Configuration
Write-Host "Setting Azure OpenAI configuration..." -ForegroundColor Yellow
vercel env rm AZURE_OPENAI_ENDPOINT --yes
vercel env add AZURE_OPENAI_ENDPOINT production
# Enter: $env:AZURE_OPENAI_ENDPOINT

vercel env rm AZURE_OPENAI_API_KEY --yes
vercel env add AZURE_OPENAI_API_KEY production
# Enter: $env:AZURE_OPENAI_API_KEY

vercel env rm OPENAI_API_KEY --yes
vercel env add OPENAI_API_KEY production
# Enter: $env:AZURE_OPENAI_API_KEY

# Application Configuration
Write-Host "Setting application configuration..." -ForegroundColor Yellow
vercel env rm SKIP_AZURE_CONFIG --yes
vercel env add SKIP_AZURE_CONFIG production
# Enter: 0

vercel env rm NODE_ENV --yes
vercel env add NODE_ENV production
# Enter: production

Write-Host "✅ Vercel environment variables updated successfully!" -ForegroundColor Green
Write-Host "🚀 Ready for production deployment!" -ForegroundColor Cyan
