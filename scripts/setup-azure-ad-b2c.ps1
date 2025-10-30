# Azure AD B2C Setup Script for Benefits AI Assistant
# This script creates a complete Azure AD B2C tenant and application

param(
    [Parameter(Mandatory=$true)]
    [string]$TenantName = "amerivetbenefits",
    
    [Parameter(Mandatory=$true)]
    [string]$AppName = "Benefits AI Assistant",
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "benefits-chatbot-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "East US",
    
    [Parameter(Mandatory=$false)]
    [string]$RedirectUri = "http://localhost:3000"
)

Write-Host "🚀 Setting up Azure AD B2C for Benefits AI Assistant..." -ForegroundColor Green

# Check if Azure CLI is installed and user is logged in
Write-Host "📋 Checking Azure CLI..." -ForegroundColor Yellow
try {
    $account = az account show --query "name" -o tsv 2>$null
    if (-not $account) {
        Write-Host "❌ Not logged into Azure CLI. Please run 'az login' first." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Logged in as: $account" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI not found. Please install Azure CLI first." -ForegroundColor Red
    exit 1
}

# Get current subscription
$subscriptionId = az account show --query "id" -o tsv
$subscriptionName = az account show --query "name" -o tsv
Write-Host "📊 Using subscription: $subscriptionName ($subscriptionId)" -ForegroundColor Cyan

# Create resource group if it doesn't exist
Write-Host "🏗️ Creating resource group..." -ForegroundColor Yellow
$rgExists = az group exists --name $ResourceGroupName --query "exists" -o tsv
if ($rgExists -eq "false") {
    az group create --name $ResourceGroupName --location $Location --output none
    Write-Host "✅ Resource group created: $ResourceGroupName" -ForegroundColor Green
} else {
    Write-Host "✅ Resource group already exists: $ResourceGroupName" -ForegroundColor Green
}

# Create Azure AD B2C tenant
Write-Host "🏢 Creating Azure AD B2C tenant..." -ForegroundColor Yellow
$b2cTenantName = "$TenantName.b2clogin.com"
$b2cDomain = "$TenantName.onmicrosoft.com"

# Check if B2C tenant already exists
$existingTenant = az ad b2c tenant list --query "[?contains(tenantName, '$TenantName')]" -o json
if ($existingTenant -eq "[]" -or $null -eq $existingTenant) {
    Write-Host "Creating new B2C tenant: $b2cDomain" -ForegroundColor Cyan
    
    # Note: B2C tenant creation via CLI is limited, so we'll provide instructions
    Write-Host "⚠️  B2C tenant creation via CLI is limited. Please create manually:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://portal.azure.com" -ForegroundColor White
    Write-Host "2. Search for 'Azure AD B2C'" -ForegroundColor White
    Write-Host "3. Click 'Create a resource' → 'Identity' → 'Azure Active Directory B2C'" -ForegroundColor White
    Write-Host "4. Choose 'Create a new Azure AD B2C tenant'" -ForegroundColor White
    Write-Host "5. Organization name: 'Amerivet Benefits'" -ForegroundColor White
    Write-Host "6. Initial domain name: '$TenantName'" -ForegroundColor White
    Write-Host "7. Resource group: '$ResourceGroupName'" -ForegroundColor White
    Write-Host "8. Location: '$Location'" -ForegroundColor White
    Write-Host ""
    Write-Host "Press Enter after creating the B2C tenant..." -ForegroundColor Yellow
    Read-Host
} else {
    Write-Host "✅ B2C tenant already exists" -ForegroundColor Green
}

# Switch to B2C tenant context
Write-Host "🔄 Switching to B2C tenant context..." -ForegroundColor Yellow
$b2cTenantId = az ad b2c tenant list --query "[?contains(tenantName, '$TenantName')].tenantId" -o tsv
if ($b2cTenantId) {
    az account set --subscription $subscriptionId
    Write-Host "✅ Switched to B2C tenant: $b2cTenantId" -ForegroundColor Green
} else {
    Write-Host "❌ Could not find B2C tenant. Please create it manually first." -ForegroundColor Red
    exit 1
}

# Create application registration
Write-Host "📱 Creating application registration..." -ForegroundColor Yellow
$appId = az ad app create --display-name $AppName --sign-in-audience "AzureADMultipleOrgs" --query "appId" -o tsv

if ($appId) {
    Write-Host "✅ Application created with ID: $appId" -ForegroundColor Green
    
    # Add redirect URI
    Write-Host "🔗 Adding redirect URI..." -ForegroundColor Yellow
    az ad app update --id $appId --spa-redirect-uris $RedirectUri --output none
    Write-Host "✅ Redirect URI added: $RedirectUri" -ForegroundColor Green
    
    # Create client secret
    Write-Host "🔐 Creating client secret..." -ForegroundColor Yellow
    $secret = az ad app credential reset --id $appId --query "password" -o tsv
    Write-Host "✅ Client secret created" -ForegroundColor Green
    
} else {
    Write-Host "❌ Failed to create application" -ForegroundColor Red
    exit 1
}

# Create user flow
Write-Host "👥 Creating user flow..." -ForegroundColor Yellow
$userFlowName = "B2C_1_signupsignin"
Write-Host "⚠️  User flow creation via CLI is limited. Please create manually:" -ForegroundColor Yellow
Write-Host "1. Go to: https://portal.azure.com/#@$b2cDomain" -ForegroundColor White
Write-Host "2. Navigate to: Azure AD B2C → User flows → New user flow" -ForegroundColor White
Write-Host "3. Select: 'Sign up and sign in' → 'Recommended' → 'Create'" -ForegroundColor White
Write-Host "4. Name: '$userFlowName'" -ForegroundColor White
Write-Host "5. Identity providers: Check 'Email signup'" -ForegroundColor White
Write-Host "6. User attributes: Select 'Email Address', 'Given Name', 'Surname'" -ForegroundColor White
Write-Host "7. Application claims: Select 'Email Addresses', 'Given Name', 'Surname', 'User's Object ID'" -ForegroundColor White
Write-Host "8. Click 'Create'" -ForegroundColor White
Write-Host ""
Write-Host "Press Enter after creating the user flow..." -ForegroundColor Yellow
Read-Host

# Generate environment variables
Write-Host "📝 Generating environment variables..." -ForegroundColor Yellow
$envContent = @"
# Azure AD B2C Configuration
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=$appId
NEXT_PUBLIC_AZURE_AD_AUTHORITY=https://$b2cTenantName/$b2cDomain/$userFlowName
NEXT_PUBLIC_AZURE_AD_KNOWN_AUTHORITIES=$b2cTenantName

# Remove demo flags for production
# SKIP_AZURE_CONFIG=1
# NEXT_PUBLIC_TEST_MODE=true
# SKIP_MIDDLEWARE=1
"@

# Save to .env.local
$envContent | Out-File -FilePath ".env.local" -Encoding UTF8
Write-Host "✅ Environment variables saved to .env.local" -ForegroundColor Green

# Display summary
Write-Host ""
Write-Host "🎉 Azure AD B2C Setup Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "Tenant Domain: $b2cDomain" -ForegroundColor Cyan
Write-Host "Application ID: $appId" -ForegroundColor Cyan
Write-Host "Redirect URI: $RedirectUri" -ForegroundColor Cyan
Write-Host "User Flow: $userFlowName" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Complete the manual B2C tenant and user flow setup above" -ForegroundColor White
Write-Host "2. Restart your dev server: pnpm dev" -ForegroundColor White
Write-Host "3. Test login at: http://localhost:3000/login" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Environment variables have been saved to .env.local" -ForegroundColor Green
Write-Host "Remove the demo flags (SKIP_AZURE_CONFIG, NEXT_PUBLIC_TEST_MODE) to enable real auth" -ForegroundColor Yellow
