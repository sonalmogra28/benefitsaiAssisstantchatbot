# Upload all AmeriVet PDF files to Azure Blob Storage
$storageAccountName = "benefitschatbotdev"
$storageAccountKey = $env:AZURE_STORAGE_ACCOUNT_KEY
$extractedFolder = "C:\Users\sonal\Downloads\drive-download-20250923T195107Z-1-001"

Write-Host "🚀 Uploading all AmeriVet PDF files..." -ForegroundColor Green

# Get all PDF files
$pdfFiles = Get-ChildItem $extractedFolder -Filter "*.pdf"

$successCount = 0
$totalCount = $pdfFiles.Count

foreach ($file in $pdfFiles) {
    Write-Host "📤 Uploading: $($file.Name)" -ForegroundColor Yellow
    
    try {
        az storage blob upload `
            --account-name $storageAccountName `
            --account-key $storageAccountKey `
            --container-name "documents" `
            --file $file.FullName `
            --name "benefits-guides/$($file.Name)" `
            --overwrite | Out-Null
            
        Write-Host "✅ Uploaded: $($file.Name)" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "❌ Failed to upload: $($file.Name)" -ForegroundColor Red
    }
}

Write-Host "🎉 Upload completed!" -ForegroundColor Green
Write-Host "📊 Successfully uploaded: $successCount/$totalCount files" -ForegroundColor Cyan
Write-Host "🌐 View your files in Azure Portal: https://portal.azure.com" -ForegroundColor Blue
