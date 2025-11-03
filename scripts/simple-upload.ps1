# Simple Azure Storage Upload Script
# Uploads AmeriVet documents to Azure Blob Storage

# Azure Storage Configuration
$storageAccountName = "benefitschatbotdev"
$storageAccountKey = $env:AZURE_STORAGE_ACCOUNT_KEY"

# Get the Downloads folder path
$downloadsPath = [Environment]::GetFolderPath("UserProfile") + "\Downloads"
$extractedFolder = "$downloadsPath\drive-download-20250923T195107Z-1-001"

Write-Host "ðŸš€ Starting AmeriVet Document Upload" -ForegroundColor Green
Write-Host "ðŸ“ Looking for files in: $extractedFolder" -ForegroundColor Yellow

if (-not (Test-Path $extractedFolder)) {
    Write-Host "âŒ Extracted folder not found: $extractedFolder" -ForegroundColor Red
    Write-Host "Please extract the ZIP file first and try again." -ForegroundColor Yellow
    exit 1
}

# Upload FAQ document
Write-Host "ðŸ“‹ Uploading FAQ document..." -ForegroundColor Cyan
$faqFile = "$extractedFolder\Amerivet FAQs and other info.docx"
if (Test-Path $faqFile) {
    az storage blob upload --account-name $storageAccountName --account-key $storageAccountKey --container-name "documents" --file $faqFile --name "faqs/Amerivet FAQs and other info.docx" --overwrite
    Write-Host "âœ… FAQ uploaded successfully" -ForegroundColor Green
} else {
    Write-Host "âš ï¸ FAQ file not found" -ForegroundColor Yellow
}

# Upload all other documents to benefits-guides
Write-Host "ðŸ“š Uploading Benefits Guide documents..." -ForegroundColor Cyan
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

$successCount = 0
$totalCount = $benefitsFiles.Count

foreach ($file in $benefitsFiles) {
    $localPath = "$extractedFolder\$file"
    if (Test-Path $localPath) {
        Write-Host "ðŸ“¤ Uploading: $file" -ForegroundColor Yellow
        az storage blob upload --account-name $storageAccountName --account-key $storageAccountKey --container-name "documents" --file $localPath --name "benefits-guides/$file" --overwrite
        Write-Host "âœ… Uploaded: $file" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "âš ï¸ File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "ðŸŽ‰ Upload completed!" -ForegroundColor Green
Write-Host "ðŸ“Š Successfully uploaded: $successCount/$totalCount files" -ForegroundColor Cyan
Write-Host "ðŸŒ View your files in Azure Portal:" -ForegroundColor Cyan
Write-Host "https://portal.azure.com" -ForegroundColor Blue
