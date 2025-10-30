# Upload All AmeriVet Documents to Azure Blob Storage
$storageAccountName = "benefitschatbotdev"
$storageAccountKey = $env:AZURE_STORAGE_ACCOUNT_KEY
$downloadsPath = [Environment]::GetFolderPath("UserProfile") + "\Downloads"

Write-Host "🚀 Starting Complete AmeriVet Document Upload" -ForegroundColor Green

# 1. Upload all files from the extracted folder to benefits-guides
$extractedFolder = "$downloadsPath\drive-download-20250923T195107Z-1-001"
if (Test-Path $extractedFolder) {
    Write-Host "📁 Uploading all files from extracted folder..." -ForegroundColor Cyan
    $allFiles = Get-ChildItem $extractedFolder -File
    foreach ($file in $allFiles) {
        Write-Host "📤 Uploading: $($file.Name)" -ForegroundColor Yellow
        az storage blob upload --account-name $storageAccountName --account-key $storageAccountKey --container-name "documents" --file $file.FullName --name "benefits-guides/$($file.Name)" --overwrite | Out-Null
        Write-Host "✅ Uploaded: $($file.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️ Extracted folder not found: $extractedFolder" -ForegroundColor Yellow
}

# 2. Upload specific DOCX files from Downloads to benefits-guides
Write-Host "📄 Uploading specific DOCX files from Downloads..." -ForegroundColor Cyan
$docxFiles = @(
    "Medical plans for Amerivet Update.docx",
    "Explaning plan options.docx"
)

foreach ($file in $docxFiles) {
    $filePath = "$downloadsPath\$file"
    if (Test-Path $filePath) {
        Write-Host "📤 Uploading: $file" -ForegroundColor Yellow
        az storage blob upload --account-name $storageAccountName --account-key $storageAccountKey --container-name "documents" --file $filePath --name "benefits-guides/$file" --overwrite | Out-Null
        Write-Host "✅ Uploaded: $file" -ForegroundColor Green
    } else {
        Write-Host "⚠️ File not found: $file" -ForegroundColor Yellow
    }
}

# 3. Upload FAQ file to faqs folder
Write-Host "📋 Uploading FAQ file..." -ForegroundColor Cyan
$faqFile = "$downloadsPath\Amerivet FAQs & other info.docx"
if (Test-Path $faqFile) {
    Write-Host "📤 Uploading: Amerivet FAQs & other info.docx" -ForegroundColor Yellow
    az storage blob upload --account-name $storageAccountName --account-key $storageAccountKey --container-name "documents" --file $faqFile --name "faqs/Amerivet FAQs & other info.docx" --overwrite | Out-Null
    Write-Host "✅ Uploaded FAQ file" -ForegroundColor Green
} else {
    Write-Host "⚠️ FAQ file not found: $faqFile" -ForegroundColor Yellow
}

Write-Host "🎉 Upload completed!" -ForegroundColor Green
Write-Host "🌐 View your files in Azure Portal: https://portal.azure.com" -ForegroundColor Blue
