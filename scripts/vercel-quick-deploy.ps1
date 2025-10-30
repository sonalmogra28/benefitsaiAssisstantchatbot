# Quick Vercel Deployment Script for Melodie
# Automated setup for amerivetaibot.bcgenrolls.com

Write-Host "🚀 Quick Vercel Deployment for amerivetaibot.bcgenrolls.com" -ForegroundColor Green
Write-Host "Contact: melodie@ultimateonlinerevenue.com" -ForegroundColor Cyan
Write-Host "Support: 888-217-4728" -ForegroundColor Cyan

# Set environment variables
$env:NEXT_PUBLIC_APP_URL = "https://amerivetaibot.bcgenrolls.com"
$env:NEXT_PUBLIC_DEPLOYMENT_MODE = "subdomain"
$env:NEXT_PUBLIC_SUBDOMAIN = "amerivetaibot"
$env:SHARED_PASSWORD_HASH = "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
$env:JWT_SECRET = "amerivet-benefits-2024-secret-key-change-in-production"

Write-Host "📋 Step 1: Installing Vercel CLI..." -ForegroundColor Yellow
try {
    npm install -g vercel
    Write-Host "✅ Vercel CLI installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install Vercel CLI. Please install manually: npm install -g vercel" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Step 2: Installing dependencies..." -ForegroundColor Yellow
if (Test-Path "pnpm-lock.yaml") {
    pnpm install
} else {
    npm install
}

Write-Host "🔧 Step 3: Building application..." -ForegroundColor Yellow
if (Test-Path "pnpm-lock.yaml") {
    pnpm run build
} else {
    npm run build
}

Write-Host "🌐 Step 4: Deploying to Vercel..." -ForegroundColor Yellow
Write-Host "Please follow these steps:" -ForegroundColor Cyan
Write-Host "1. Run: vercel login" -ForegroundColor White
Write-Host "2. Use email: melodie@ultimateonlinerevenue.com" -ForegroundColor White
Write-Host "3. Run: vercel --prod" -ForegroundColor White
Write-Host "4. Follow prompts to configure project" -ForegroundColor White

Write-Host ""
Write-Host "📋 Environment Variables to Set in Vercel:" -ForegroundColor Yellow
Write-Host "NEXT_PUBLIC_APP_URL = https://amerivetaibot.bcgenrolls.com" -ForegroundColor White
Write-Host "NEXT_PUBLIC_DEPLOYMENT_MODE = subdomain" -ForegroundColor White
Write-Host "NEXT_PUBLIC_SUBDOMAIN = amerivetaibot" -ForegroundColor White
Write-Host "SHARED_PASSWORD_HASH = a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3" -ForegroundColor White
Write-Host "JWT_SECRET = amerivet-benefits-2024-secret-key-change-in-production" -ForegroundColor White

Write-Host ""
Write-Host "🌐 After deployment, configure domain:" -ForegroundColor Yellow
Write-Host "Domain: amerivetaibot.bcgenrolls.com" -ForegroundColor White
Write-Host "DNS: CNAME amerivetaibot -> cname.vercel-dns.com" -ForegroundColor White

Write-Host ""
Write-Host "🔐 Employee Access:" -ForegroundColor Yellow
Write-Host "URL: https://amerivetaibot.bcgenrolls.com" -ForegroundColor White
Write-Host "Password: amerivet2024!" -ForegroundColor White

Write-Host ""
Write-Host "📞 Support: 888-217-4728" -ForegroundColor Cyan
Write-Host "📧 Technical: sonalmogra.888@gmail.com" -ForegroundColor Cyan
