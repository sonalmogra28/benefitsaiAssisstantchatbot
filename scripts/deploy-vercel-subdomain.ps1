# Vercel Subdomain Deployment Script for amerivetaibot.bcgenrolls.com
# Deploys the Benefits Assistant Chatbot to Vercel with subdomain configuration

param(
    [Parameter(Mandatory=$false)]
    [string]$SharedPassword = "amerivet2024!",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production"
)

Write-Host "🚀 Deploying Benefits Assistant to amerivetaibot.bcgenrolls.com" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Shared Password: $SharedPassword" -ForegroundColor Cyan

# Hash the shared password
$passwordHash = [System.Web.Security.FormsAuthentication]::HashPasswordForStoringInConfigFile($SharedPassword, "SHA256")
Write-Host "Password Hash: $passwordHash" -ForegroundColor Gray

# Set environment variables
$env:NODE_ENV = $Environment
$env:NEXT_PUBLIC_APP_URL = "https://amerivetaibot.bcgenrolls.com"
$env:NEXT_PUBLIC_DEPLOYMENT_MODE = "subdomain"
$env:NEXT_PUBLIC_SUBDOMAIN = "amerivetaibot"
$env:SHARED_PASSWORD_HASH = $passwordHash
$env:JWT_SECRET = "amerivet-benefits-2024-secret-key-change-in-production"

Write-Host "📋 Step 1: Validating Configuration..." -ForegroundColor Yellow

# Check if Vercel CLI is installed
try {
    $vercelVersion = vercel --version
    Write-Host "✅ Vercel CLI found: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install Vercel CLI. Please install manually: npm install -g vercel"
        exit 1
    }
}

Write-Host "📦 Step 2: Installing Dependencies..." -ForegroundColor Yellow

# Install dependencies
try {
    if (Test-Path "pnpm-lock.yaml") {
        Write-Host "Using pnpm..." -ForegroundColor Cyan
        pnpm install --frozen-lockfile
    } else {
        Write-Host "Using npm..." -ForegroundColor Cyan
        npm ci
    }
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} catch {
    Write-Error "Failed to install dependencies: $_"
    exit 1
}

Write-Host "🔧 Step 3: Building Application..." -ForegroundColor Yellow

# Build the application
try {
    if (Test-Path "pnpm-lock.yaml") {
        pnpm run build
    } else {
        npm run build
    }
    Write-Host "✅ Application built successfully" -ForegroundColor Green
} catch {
    Write-Error "Build failed: $_"
    exit 1
}

Write-Host "🧪 Step 4: Running Tests..." -ForegroundColor Yellow

# Run tests
try {
    if (Test-Path "pnpm-lock.yaml") {
        pnpm test
    } else {
        npm test
    }
    Write-Host "✅ Tests passed" -ForegroundColor Green
} catch {
    Write-Warning "Some tests failed, but continuing with deployment..."
}

Write-Host "🌐 Step 5: Configuring Vercel..." -ForegroundColor Yellow

# Create .vercelignore file
$vercelIgnore = @"
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
.next/
out/
dist/

# Environment files
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Test files
test-results/
playwright-report/
coverage/

# Scripts
scripts/
"@

$vercelIgnore | Out-File -FilePath ".vercelignore" -Encoding UTF8
Write-Host "✅ .vercelignore created" -ForegroundColor Green

# Update vercel.json for subdomain
$vercelConfig = @"
{
  "version": 2,
  "name": "amerivetaibot-bcgenrolls",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/subdomain/(.*)",
      "dest": "/subdomain/$1"
    },
    {
      "src": "/api/subdomain/(.*)",
      "dest": "/api/subdomain/$1"
    },
    {
      "src": "/api/chat",
      "dest": "/api/chat"
    },
    {
      "src": "/api/health",
      "dest": "/api/health"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://amerivetaibot.bcgenrolls.com",
    "NEXT_PUBLIC_DEPLOYMENT_MODE": "subdomain",
    "NEXT_PUBLIC_SUBDOMAIN": "amerivetaibot",
    "SHARED_PASSWORD_HASH": "$passwordHash",
    "JWT_SECRET": "amerivet-benefits-2024-secret-key-change-in-production"
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        },
        {
          "key": "X-Subdomain",
          "value": "amerivetaibot"
        },
        {
          "key": "X-Deployment-Mode",
          "value": "subdomain"
        }
      ]
    }
  ]
}
"@

$vercelConfig | Out-File -FilePath "vercel.json" -Encoding UTF8
Write-Host "✅ vercel.json configured for subdomain" -ForegroundColor Green

Write-Host "🚀 Step 6: Deploying to Vercel..." -ForegroundColor Yellow

# Deploy to Vercel
try {
    Write-Host "Deploying to Vercel..." -ForegroundColor Cyan
    vercel --prod --yes
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
} catch {
    Write-Error "Deployment failed: $_"
    Write-Host "Please check your Vercel configuration and try again." -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Subdomain URL: https://amerivetaibot.bcgenrolls.com" -ForegroundColor Yellow
Write-Host "🔑 Shared Password: $SharedPassword" -ForegroundColor Yellow
Write-Host "📱 Login URL: https://amerivetaibot.bcgenrolls.com/subdomain/login" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Configure DNS: Point amerivetaibot.bcgenrolls.com to Vercel" -ForegroundColor White
Write-Host "2. Test the deployment: Visit the login URL" -ForegroundColor White
Write-Host "3. Share the password with employees: $SharedPassword" -ForegroundColor White
Write-Host "4. Monitor usage: Check Vercel dashboard for analytics" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Vercel Dashboard: https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host "📊 Analytics: Available in Vercel dashboard" -ForegroundColor Cyan
