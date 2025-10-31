# Azure Resource Discovery Script
Write-Host "=== Azure Resource Discovery ===" -ForegroundColor Cyan

$rg = "benefits-chatbot-rg"

Write-Host "`nResource Group: $rg" -ForegroundColor Yellow
Write-Host "Discovering resources..." -ForegroundColor Gray

# Get all resources
$resources = az resource list --resource-group $rg --query "[].{Name:name, Type:type, Location:location}" | ConvertFrom-Json

Write-Host "`n=== Found Resources ===" -ForegroundColor Green

# Cosmos DB
$cosmos = $resources | Where-Object { $_.Type -like "*DocumentDB*" }
if ($cosmos) {
    Write-Host "`n[Cosmos DB]" -ForegroundColor Cyan
    Write-Host "  Name: $($cosmos.Name)"
    Write-Host "  Location: $($cosmos.Location)"
}

# Search
$search = $resources | Where-Object { $_.Type -like "*Search*" }
if ($search) {
    Write-Host "`n[Azure AI Search]" -ForegroundColor Cyan
    Write-Host "  Name: $($search.Name)"
    Write-Host "  Location: $($search.Location)"
}

# Redis
$redis = $resources | Where-Object { $_.Type -like "*Redis*" }
if ($redis) {
    Write-Host "`n[Redis Cache]" -ForegroundColor Cyan
    Write-Host "  Name: $($redis.Name)"
    Write-Host "  Location: $($redis.Location)"
}

# Storage
$storage = $resources | Where-Object { $_.Type -like "*Storage*" -and $_.Type -notlike "*StorageSync*" }
if ($storage) {
    Write-Host "`n[Storage Account]" -ForegroundColor Cyan
    Write-Host "  Name: $($storage.Name)"
    Write-Host "  Location: $($storage.Location)"
}

# OpenAI / Cognitive Services
$openai = $resources | Where-Object { $_.Type -like "*CognitiveServices*" }
if ($openai) {
    Write-Host "`n[Azure OpenAI]" -ForegroundColor Cyan
    Write-Host "  Name: $($openai.Name)"
    Write-Host "  Location: $($openai.Location)"
}

Write-Host "`n=== Summary ===" -ForegroundColor Yellow
Write-Host "Total resources found: $($resources.Count)"
Write-Host "`nUpdate regen-keys.ps1 with these names." -ForegroundColor Green
