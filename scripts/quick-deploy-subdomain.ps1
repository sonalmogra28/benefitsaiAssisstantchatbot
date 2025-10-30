# Quick Subdomain Deployment Script
# Simple deployment for testing the subdomain functionality

param(
    [Parameter(Mandatory=$false)]
    [string]$Subdomain = "demo",
    
    [Parameter(Mandatory=$false)]
    [string]$Port = "3001"
)

Write-Host "🚀 Quick Subdomain Deployment" -ForegroundColor Green
Write-Host "Subdomain: $Subdomain" -ForegroundColor Cyan
Write-Host "Port: $Port" -ForegroundColor Cyan

# Set environment variables
$env:NODE_ENV = "development"
$env:NEXT_PUBLIC_APP_URL = "http://localhost:$Port"
$env:NEXT_PUBLIC_DEPLOYMENT_MODE = "subdomain"
$env:NEXT_PUBLIC_SUBDOMAIN = $Subdomain
$env:SHARED_PASSWORD_HASH = "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3" # "hello" hashed

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
if (Test-Path "pnpm-lock.yaml") {
    pnpm install
} else {
    npm install
}

Write-Host "🔧 Building application..." -ForegroundColor Yellow
if (Test-Path "pnpm-lock.yaml") {
    pnpm run build
} else {
    npm run build
}

Write-Host "🌐 Starting subdomain server on port $Port..." -ForegroundColor Yellow
Write-Host "Access the subdomain at: http://localhost:$Port/subdomain/login" -ForegroundColor Green
Write-Host "Shared password: benefits2024!" -ForegroundColor Yellow

# Start the development server
if (Test-Path "pnpm-lock.yaml") {
    pnpm run dev -- --port $Port
} else {
    npm run dev -- --port $Port
}
