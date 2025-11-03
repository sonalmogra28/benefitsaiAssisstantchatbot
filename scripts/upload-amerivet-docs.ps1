# Upload AmeriVet Training Documents to Azure Blob Storage
# This script uploads your specific documents to the correct containers

# Azure Storage Configuration
$storageAccountName = "benefitschatbotdev"
$storageAccountKey = $env:AZURE_STORAGE_ACCOUNT_KEY

# Helper Functions
function Write-Host-Color {
    param (
        [string]$Message,
        [string]$ForegroundColor = "White"
    )
    Write-Host $Message -ForegroundColor $ForegroundColor
}

function Upload-File {
    param(
        [string]$LocalFile,
        [string]$Container,
        [string]$BlobPath
    )
    
    try {
        Write-Host-Color "📤 Uploading: $LocalFile" Yellow
        
        az storage blob upload `
            --account-name $storageAccountName `
            --account-key $storageAccountKey `
            --container-name $Container `
            --file $LocalFile `
            --name $BlobPath `
            --overwrite | Out-Null
            
        Write-Host-Color "✅ Uploaded to $Container/$BlobPath" Green
        return $true
    }
    catch {
        Write-Host-Color "❌ Failed to upload $LocalFile : $($_.Exception.Message)" Red
        return $false
    }
}

# Main Script
Write-Host-Color "🚀 Starting AmeriVet Document Upload" Green

# Get the Downloads folder path
$downloadsPath = [Environment]::GetFolderPath("UserProfile") + "\Downloads"
$extractedFolder = "$downloadsPath\drive-download-20250923T195107Z-1-001"

if (-not (Test-Path $extractedFolder)) {
    Write-Host-Color "❌ Extracted folder not found: $extractedFolder" Red
    Write-Host-Color "Please extract the ZIP file first and try again." Yellow
    exit 1
}

Write-Host-Color "📁 Found extracted folder: $extractedFolder" Cyan

# Upload FAQs
Write-Host-Color "📋 Uploading FAQ documents..." Cyan
$faqFiles = @(
    "Amerivet FAQs and other info.docx"
)

foreach ($file in $faqFiles) {
    $localPath = "$extractedFolder\$file"
    if (Test-Path $localPath) {
        Upload-File -LocalFile $localPath -Container "documents" -BlobPath "faqs/$file"
    }
    else {
        Write-Host-Color "⚠️ File not found: $file" Yellow
    }
}

# Upload Benefits Guides
Write-Host-Color "📚 Uploading Benefits Guide documents..." Cyan
$benefitsFiles = @(
    "Medical plans for Amerivet Update.docx",
    "Explaning plan options.docx",
    "Vision - Benefit Summary AmeriVet Partners Mgmt.",
    "Southern CA Amervet 235878 SBC-DHMO 2K 20_2024",
    "Sold Vol Worksite Unum Propsal effective 10 01 2024 AmeriVet",
    "SOLD Vol STD Unum Proposal effective 10 01 2024 AmeriVet",
    "SBC_Amerivet_Standard HSA 3500_10.01.2024-12.31.2025",
    "SBC_Amerivet_Enhanced HSA 2000_10.01.2024-12.31.2025",
    "SBC_Amerivet_s_PPO_10.01.2024-12.31.2025",
    "Northern CA AmeriVet 607483 SBC-DHMO 500 20_2024",
    "Northern CA AmeriVet 607483 SBC-DHMO 2K 20_2024",
    "Getting_Started_with_Rightway_1_",
    "AmeriVet_KP Wash. Standard HMO_2024-2025",
    "Amerivet_KP NW Oregon Standard HMO 2024-2025",
    "Amerivet_KP NW Oregon Enhanched HMO 2024-2025",
    "AmeriVet_KP Wash. Enhanced HMO_2024-2025",
    "AmeriVet OE Brochure_v7.1_8-28-24_Final"
)

foreach ($file in $benefitsFiles) {
    $localPath = "$extractedFolder\$file"
    if (Test-Path $localPath) {
        Upload-File -LocalFile $localPath -Container "documents" -BlobPath "benefits-guides/$file"
    }
    else {
        Write-Host-Color "⚠️ File not found: $file" Yellow
    }
}

Write-Host-Color "🎉 Upload completed!" Green
Write-Host-Color "🌐 View your files in Azure Portal:" Cyan
Write-Host-Color "https://portal.azure.com/#@melodiehendersongmail.onmicrosoft.com/resource/subscriptions/ab57bda9-b1ed-4ca1-8755-1e137948cd9b/resourceGroups/benefits-chatbot-project/providers/Microsoft.Storage/storageAccounts/benefitschatbotdev/containers" Cyan
