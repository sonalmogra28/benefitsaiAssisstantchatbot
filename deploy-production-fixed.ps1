# Production Deployment Script
# Google Principal Engineer Approach - Global Scale Deployment
# Enhanced for Enterprise-Grade Architecture

Write-Host "Starting Global Production Deployment..." -ForegroundColor Green
Write-Host "Using Enterprise-Grade Architecture with Service Factory Pattern" -ForegroundColor Cyan

# Set production environment variables
$env:NODE_ENV = "production"
$env:SKIP_AZURE_CONFIG = "0"  # Enable Azure services in production
$env:ENABLE_MOCK_SERVICES = "0"  # Disable mocks in production
$env:BUILD_TIME = "0"  # Not in build time
$env:LOG_LEVEL = "info"  # Production logging level

# Azure Configuration from existing resources
$env:AZURE_COSMOS_ENDPOINT = "https://benefits-chatbot-cosmos-dev.documents.azure.com:443/"
$env:AZURE_COSMOS_KEY = $env:AZURE_COSMOS_KEY
$env:AZURE_COSMOS_DATABASE = "BenefitsChat"

$env:AZURE_STORAGE_CONNECTION_STRING = $env:AZURE_STORAGE_CONNECTION_STRING

$env:REDIS_URL = $env:REDIS_URL

$env:AZURE_OPENAI_ENDPOINT = "https://benefits-chatbot-openai2.openai.azure.com/"
$env:AZURE_OPENAI_API_KEY = $env:AZURE_OPENAI_API_KEY
$env:AZURE_OPENAI_API_VERSION = "2024-02-15-preview"
$env:AZURE_OPENAI_DEPLOYMENT_NAME = "gpt-4"

# Application URLs
$env:NEXT_PUBLIC_APP_URL = "https://amerivetaibot.bcgenrolls.com"
$env:NEXT_PUBLIC_DEPLOYMENT_MODE = "production"
$env:NEXT_PUBLIC_SUBDOMAIN = "amerivetaibot"

# Security (using your provided keys)
$env:JWT_SECRET = "153bdde129ce14148df2eef4ab45f471ad531d8a079f179c9627197c4c44f9a2"
$env:ENCRYPTION_KEY = "a56a41e8548239b631ba00c7463fb0d51073036136a726120851d5a05fbbddd2"

Write-Host "Environment variables set" -ForegroundColor Green

# Build the application
Write-Host "Building application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful!" -ForegroundColor Green
    
    # Commit and push changes
    Write-Host "Committing and pushing changes..." -ForegroundColor Yellow
    git add .
    git commit -m "Production deployment: Streamlined architecture with Azure integration"
    git push origin main
    
    Write-Host "Deployment initiated!" -ForegroundColor Green
    Write-Host "Global deployment URL: https://amerivetaibot.bcgenrolls.com" -ForegroundColor Cyan
    Write-Host "Monitor deployment at: https://vercel.com/dashboard" -ForegroundColor Cyan
    
}
else {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
