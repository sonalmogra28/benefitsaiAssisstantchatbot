#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Retrieves all Azure resource keys via Azure CLI and creates a clean .env.local file.

.DESCRIPTION
    This script:
    1. Fetches keys from Azure OpenAI, Cosmos DB, AI Search, Storage Account, and Redis
    2. Strips all newlines, CRLF, and extra whitespace
    3. Writes clean key=value pairs to .env.local
    4. Ensures no trailing slashes or extra characters

.NOTES
    Requires Azure CLI (az) to be installed and logged in.
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ANSI colors for output
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = $Reset)
    Write-Host "${Color}${Message}${Reset}"
}

function Get-CleanValue {
    param([string]$Value)
    
    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }
    
    # Remove all newlines, carriage returns, ANSI escape codes, and trim whitespace
    $cleaned = $Value -replace "`r`n", "" -replace "`n", "" -replace "`r", "" -replace "`e\[[0-9;]*m", ""
    $cleaned = $cleaned.Trim()
    
    # Remove any trailing/leading special characters that aren't alphanumeric, dash, underscore, or dot
    # but preserve characters within the string
    $cleaned = $cleaned -replace '^[^a-zA-Z0-9]+|[^a-zA-Z0-9/+=:;@._-]+$', ''
    
    return $cleaned
}

function Get-AzureResourceGroup {
    Write-ColorOutput "Finding Azure resource group..." $Cyan
    
    # Try common patterns
    $rgPatterns = @(
        "rg-benefits*",
        "*benefitsaichatbot*",
        "rg-benefitschat*"
    )
    
    foreach ($pattern in $rgPatterns) {
        $rgs = az group list --query "[?contains(name, '$($pattern -replace '\*', '')')].[name]" -o tsv 2>$null
        if ($rgs) {
            $rg = ($rgs -split "`n")[0].Trim()
            if ($rg) {
                Write-ColorOutput "Found resource group: $rg" $Green
                return $rg
            }
        }
    }
    
    # List all resource groups and let user choose
    Write-ColorOutput "Could not auto-detect resource group" $Yellow
    $allRgs = az group list --query "[].name" -o tsv
    
    if (-not $allRgs) {
        throw "No resource groups found. Please create Azure resources first."
    }
    
    Write-ColorOutput "`nAvailable resource groups:" $Cyan
    $rgArray = @($allRgs -split "`n" | Where-Object { $_.Trim() -ne "" })
    for ($i = 0; $i -lt $rgArray.Length; $i++) {
        Write-Host "$($i + 1). $($rgArray[$i])"
    }
    
    $selection = Read-Host "`nSelect resource group number"
    $selectedRg = $rgArray[[int]$selection - 1]
    
    if (-not $selectedRg) {
        throw "Invalid selection"
    }
    
    return $selectedRg.Trim()
}

function Get-AzureOpenAIConfig {
    param([string]$ResourceGroup)
    
    Write-ColorOutput "`nRetrieving Azure OpenAI configuration..." $Cyan
    
    # Find OpenAI account
    $ErrorActionPreference = "SilentlyContinue"
    $openaiAccount = (az cognitiveservices account list `
        --resource-group $ResourceGroup `
        --query "[?kind=='OpenAI'].name" -o tsv 2>&1 | Where-Object { $_ -is [string] -and $_ -notmatch '^\s*$' } | Select-Object -First 1)
    $ErrorActionPreference = "Stop"
    
    if (-not $openaiAccount) {
        Write-ColorOutput "No OpenAI account found in $ResourceGroup" $Yellow
        return $null
    }
    
    $openaiAccount = Get-CleanValue $openaiAccount
    Write-ColorOutput "  Found: $openaiAccount" $Green
    
    # Get endpoint
    $endpoint = az cognitiveservices account show `
        --name $openaiAccount `
        --resource-group $ResourceGroup `
        --query "properties.endpoint" -o tsv 2>$null
    
    # Get key
    $key = az cognitiveservices account keys list `
        --name $openaiAccount `
        --resource-group $ResourceGroup `
        --query "key1" -o tsv 2>$null
    
    # Get deployment name
    $deployment = az cognitiveservices account deployment list `
        --name $openaiAccount `
        --resource-group $ResourceGroup `
        --query "[0].name" -o tsv 2>$null
    
    return @{
        Endpoint = Get-CleanValue $endpoint
        Key = Get-CleanValue $key
        Deployment = Get-CleanValue $deployment
    }
}

function Get-CosmosDBConfig {
    param([string]$ResourceGroup)
    
    Write-ColorOutput "`nRetrieving Cosmos DB configuration..." $Cyan
    
    # Find Cosmos account
    $ErrorActionPreference = "SilentlyContinue"
    $cosmosAccount = (az cosmosdb list `
        --resource-group $ResourceGroup `
        --query "[0].name" -o tsv 2>&1 | Where-Object { $_ -is [string] -and $_ -notmatch '^\s*$' } | Select-Object -First 1)
    $ErrorActionPreference = "Stop"
    
    if (-not $cosmosAccount) {
        Write-ColorOutput "No Cosmos DB account found in $ResourceGroup" $Yellow
        return $null
    }
    
    $cosmosAccount = Get-CleanValue $cosmosAccount
    Write-ColorOutput "  Found: $cosmosAccount" $Green
    
    # Get endpoint
    $endpoint = az cosmosdb show `
        --name $cosmosAccount `
        --resource-group $ResourceGroup `
        --query "documentEndpoint" -o tsv 2>$null
    
    # Get key
    $key = az cosmosdb keys list `
        --name $cosmosAccount `
        --resource-group $ResourceGroup `
        --query "primaryMasterKey" -o tsv 2>$null
    
    return @{
        Endpoint = Get-CleanValue $endpoint
        Key = Get-CleanValue $key
    }
}

function Get-SearchConfig {
    param([string]$ResourceGroup)
    
    Write-ColorOutput "`nRetrieving Azure AI Search configuration..." $Cyan
    
    # Find Search service
    $ErrorActionPreference = "SilentlyContinue"
    $searchService = (az search service list `
        --resource-group $ResourceGroup `
        --query "[0].name" -o tsv 2>&1 | Where-Object { $_ -is [string] -and $_ -notmatch '^\s*$' } | Select-Object -First 1)
    $ErrorActionPreference = "Stop"
    
    if (-not $searchService) {
        Write-ColorOutput "No AI Search service found in $ResourceGroup" $Yellow
        return $null
    }
    
    $searchService = Get-CleanValue $searchService
    Write-ColorOutput "  Found: $searchService" $Green
    
    # Get endpoint
    $endpoint = "https://$searchService.search.windows.net"
    
    # Get admin key
    $key = az search admin-key show `
        --service-name $searchService `
        --resource-group $ResourceGroup `
        --query "primaryKey" -o tsv 2>$null
    
    # Try to get index name (may not be available via CLI easily)
    # Use default if not found
    $indexName = "benefits-documents"
    Write-ColorOutput "  Using index name: $indexName" $Yellow
    
    return @{
        Endpoint = Get-CleanValue $endpoint
        Key = Get-CleanValue $key
        IndexName = Get-CleanValue $indexName
    }
}

function Get-StorageConfig {
    param([string]$ResourceGroup)
    
    Write-ColorOutput "`nRetrieving Azure Storage configuration..." $Cyan
    
    # Find Storage account
    $ErrorActionPreference = "SilentlyContinue"
    $storageAccount = (az storage account list `
        --resource-group $ResourceGroup `
        --query "[0].name" -o tsv 2>&1 | Where-Object { $_ -is [string] -and $_ -notmatch '^\s*$' } | Select-Object -First 1)
    $ErrorActionPreference = "Stop"
    
    if (-not $storageAccount) {
        Write-ColorOutput "No Storage account found in $ResourceGroup" $Yellow
        return $null
    }
    
    $storageAccount = Get-CleanValue $storageAccount
    Write-ColorOutput "  Found: $storageAccount" $Green
    
    # Get connection string
    $connectionString = az storage account show-connection-string `
        --name $storageAccount `
        --resource-group $ResourceGroup `
        --query "connectionString" -o tsv 2>$null
    
    return @{
        ConnectionString = Get-CleanValue $connectionString
    }
}

function Get-RedisConfig {
    param([string]$ResourceGroup)
    
    Write-ColorOutput "`nRetrieving Redis configuration..." $Cyan
    
    # Find Redis cache
    $ErrorActionPreference = "SilentlyContinue"
    $redisCache = (az redis list `
        --resource-group $ResourceGroup `
        --query "[0].name" -o tsv 2>&1 | Where-Object { $_ -is [string] -and $_ -notmatch '^\s*$' } | Select-Object -First 1)
    $ErrorActionPreference = "Stop"
    
    if (-not $redisCache) {
        Write-ColorOutput "No Redis cache found, using localhost" $Yellow
        return @{
            Url = "redis://localhost:6379"
        }
    }
    
    $redisCache = Get-CleanValue $redisCache
    Write-ColorOutput "  Found: $redisCache" $Green
    
    # Get hostname
    $hostname = az redis show `
        --name $redisCache `
        --resource-group $ResourceGroup `
        --query "hostName" -o tsv 2>$null
    
    # Get access key
    $key = az redis list-keys `
        --name $redisCache `
        --resource-group $ResourceGroup `
        --query "primaryKey" -o tsv 2>$null
    
    $hostname = Get-CleanValue $hostname
    $key = Get-CleanValue $key
    
    # Check SSL port
    $sslPort = az redis show `
        --name $redisCache `
        --resource-group $ResourceGroup `
        --query "sslPort" -o tsv 2>$null
    
    $port = if ($sslPort) { Get-CleanValue $sslPort } else { "6380" }
    
    $url = "rediss://:$key@$hostname`:$port"
    
    return @{
        Url = Get-CleanValue $url
    }
}

function Write-EnvFile {
    param([hashtable]$Config)
    
    Write-ColorOutput "`nWriting .env.local file..." $Cyan
    
    $envPath = Join-Path $PSScriptRoot ".env.local"
    
    # Create clean env content (no BOM, LF only)
    $lines = @()
    $lines += "# Azure OpenAI Configuration"
    $lines += "AZURE_OPENAI_ENDPOINT=$($Config.AzureOpenAI.Endpoint)"
    $lines += "AZURE_OPENAI_API_KEY=$($Config.AzureOpenAI.Key)"
    $lines += "AZURE_OPENAI_DEPLOYMENT_NAME=$($Config.AzureOpenAI.Deployment)"
    $lines += "AZURE_OPENAI_API_VERSION=2024-02-15-preview"
    $lines += ""
    $lines += "# Azure Cosmos DB Configuration"
    $lines += "AZURE_COSMOS_ENDPOINT=$($Config.CosmosDB.Endpoint)"
    $lines += "AZURE_COSMOS_KEY=$($Config.CosmosDB.Key)"
    $lines += "AZURE_COSMOS_DATABASE=BenefitsChat"
    $lines += ""
    $lines += "# Azure AI Search Configuration"
    $lines += "AZURE_SEARCH_ENDPOINT=$($Config.Search.Endpoint)"
    $lines += "AZURE_SEARCH_ADMIN_KEY=$($Config.Search.Key)"
    $lines += "AZURE_SEARCH_INDEX_NAME=$($Config.Search.IndexName)"
    $lines += ""
    $lines += "# Azure Storage Configuration"
    $lines += "AZURE_STORAGE_CONNECTION_STRING=$($Config.Storage.ConnectionString)"
    $lines += "AZURE_STORAGE_CONTAINER_NAME=documents"
    $lines += ""
    $lines += "# Redis Configuration"
    $lines += "REDIS_URL=$($Config.Redis.Url)"
    $lines += "RATE_LIMIT_REDIS_URL=$($Config.Redis.Url)"
    $lines += ""
    $lines += "# NextAuth Configuration"
    $lines += "NEXTAUTH_URL=http://localhost:3000"
    $lines += "NEXTAUTH_SECRET=$([System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([Guid]::NewGuid().ToString())))"
    $lines += "AUTH_TRUST_HOST=true"
    $lines += ""
    $lines += "# Application Security"
    $lines += "SHARED_PASSWORD=demo-password-change-in-production"
    
    # Generate random encryption key (PowerShell 5.1 compatible)
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    $bytes = New-Object byte[] 32
    $rng.GetBytes($bytes)
    $encryptionKey = [System.Convert]::ToBase64String($bytes)
    $lines += "ENCRYPTION_KEY=$encryptionKey"
    $lines += ""
    $lines += "# Domain Configuration"
    $lines += "DOMAIN_ROOT=localhost"
    $lines += "NEXT_PUBLIC_ENVIRONMENT=development"
    $lines += ""
    $lines += "# Feature Flags"
    $lines += "FAST_HEALTH=1"
    $lines += "ENABLE_ANALYTICS=1"
    $lines += "ENABLE_AUDIT_LOGS=1"
    $lines += ""
    $lines += "# Observability"
    $lines += "LOG_LEVEL=info"
    $lines += "ENABLE_TELEMETRY=1"
    
    # Write with UTF8 no BOM and LF line endings
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    $content = ($lines -join "`n") + "`n"
    [System.IO.File]::WriteAllText($envPath, $content, $utf8NoBom)
    
    Write-ColorOutput "Created $envPath" $Green
}

# Main execution
try {
    Write-Host "========================================"
    Write-Host "Azure Environment Setup Script"
    Write-Host "Retrieves keys directly from Azure CLI"
    Write-Host "========================================"
    Write-Host ""

    # Disable Azure CLI colors to prevent ANSI codes in output
    $env:AZURE_CORE_NO_COLOR = "true"

    # Verify Azure CLI is logged in
    Write-ColorOutput "Verifying Azure CLI login..." $Cyan
    $subscription = az account show --query name -o tsv 2>$null
    if (-not $subscription) {
        throw "Not logged into Azure CLI. Run: az login"
    }
    $subscription = Get-CleanValue $subscription
    Write-ColorOutput "Logged into: $subscription" $Green
    
    # Get resource group
    $resourceGroup = Get-AzureResourceGroup
    
    # Initialize config
    $config = @{
        AzureOpenAI = @{ Endpoint = ""; Key = ""; Deployment = "" }
        CosmosDB = @{ Endpoint = ""; Key = "" }
        Search = @{ Endpoint = ""; Key = ""; IndexName = "" }
        Storage = @{ ConnectionString = "" }
        Redis = @{ Url = "" }
    }
    
    # Fetch all configurations
    $openai = Get-AzureOpenAIConfig -ResourceGroup $resourceGroup
    if ($openai) { $config.AzureOpenAI = $openai }
    
    $cosmos = Get-CosmosDBConfig -ResourceGroup $resourceGroup
    if ($cosmos) { $config.CosmosDB = $cosmos }
    
    $search = Get-SearchConfig -ResourceGroup $resourceGroup
    if ($search) { $config.Search = $search }
    
    $storage = Get-StorageConfig -ResourceGroup $resourceGroup
    if ($storage) { $config.Storage = $storage }
    
    $redis = Get-RedisConfig -ResourceGroup $resourceGroup
    if ($redis) { $config.Redis = $redis }
    
    # Write .env.local
    Write-EnvFile -Config $config
    
    Write-Host ""
    Write-ColorOutput "Setup Complete!" $Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Review .env.local for accuracy"
    Write-Host "2. Run: npm run dev"
    Write-Host "3. Test QA endpoint: curl http://localhost:3000/api/qa"
    Write-Host ""

} catch {
    Write-ColorOutput "`nError: $($_.Exception.Message)" $Red
    Write-ColorOutput $_.ScriptStackTrace $Red
    exit 1
}
