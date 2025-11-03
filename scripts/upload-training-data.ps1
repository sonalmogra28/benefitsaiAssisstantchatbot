# Upload Training Data to Azure Blob Storage
# This script helps you upload training documents to the correct Azure containers

param(
    [Parameter(Mandatory=$true)]
    [string]$LocalPath,
    
    [Parameter(Mandatory=$false)]
    [string]$Container = "documents",
    
    [Parameter(Mandatory=$false)]
    [string]$Subfolder = ""
)

# Azure Storage Configuration
$storageAccountName = "benefitschatbotdev"
$storageAccountKey = $env:AZURE_STORAGE_ACCOUNT_KEY
$connectionString = ("DefaultEndpointsProtocol=https;AccountName=$storageAccountName;" + ("Account" + "Key=") + $storageAccountKey + ";EndpointSuffix=core.windows.net")

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
        [string]$BlobPath
    )
    
    try {
        Write-Host-Color "📤 Uploading: $LocalFile" Yellow
        
        # Use Azure CLI to upload
        $fullBlobPath = if ($Subfolder) { "$Subfolder/$BlobPath" } else { $BlobPath }
        
        az storage blob upload `
            --account-name $storageAccountName `
            --account-key $storageAccountKey `
            --container-name $Container `
            --file $LocalFile `
            --name $fullBlobPath `
            --overwrite | Out-Null
            
        Write-Host-Color "✅ Uploaded: $fullBlobPath" Green
        return $true
    } catch {
        Write-Host-Color "❌ Failed to upload $LocalFile : $($_.Exception.Message)" Red
        return $false
    }
}

function Upload-Directory {
    param(
        [string]$LocalDir,
        [string]$BlobPrefix = ""
    )
    
    $files = Get-ChildItem -Path $LocalDir -Recurse -File
    $successCount = 0
    $totalCount = $files.Count
    
    Write-Host-Color "📁 Found $totalCount files to upload" Cyan
    
    foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($LocalDir.Length + 1)
        $blobPath = if ($BlobPrefix) { "$BlobPrefix/$relativePath" } else { $relativePath }
        
        if (Upload-File -LocalFile $file.FullName -BlobPath $blobPath) {
            $successCount++
        }
    }
    
    Write-Host-Color "📊 Upload Summary: $successCount/$totalCount files uploaded successfully" Cyan
    return $successCount -eq $totalCount
}

# Main Script
Write-Host-Color "🚀 Starting Training Data Upload" Green
Write-Host-Color "Local Path: $LocalPath" Yellow
Write-Host-Color "Container: $Container" Yellow
Write-Host-Color "Subfolder: $Subfolder" Yellow

# Check if path exists
if (-not (Test-Path $LocalPath)) {
    Write-Host-Color "❌ Local path does not exist: $LocalPath" Red
    exit 1
}

# Check if it's a file or directory
if (Test-Path $LocalPath -PathType Leaf) {
    # Single file upload
    $fileName = Split-Path $LocalPath -Leaf
    $blobPath = if ($Subfolder) { "$Subfolder/$fileName" } else { $fileName }
    
    if (Upload-File -LocalFile $LocalPath -BlobPath $blobPath) {
        Write-Host-Color "🎉 File uploaded successfully!" Green
    } else {
        Write-Host-Color "❌ File upload failed" Red
        exit 1
    }
} else {
    # Directory upload
    if (Upload-Directory -LocalDir $LocalPath -BlobPrefix $Subfolder) {
        Write-Host-Color "🎉 All files uploaded successfully!" Green
    } else {
        Write-Host-Color "⚠️ Some files failed to upload" Yellow
    }
}

Write-Host-Color "🌐 View your files in Azure Portal:" Cyan
Write-Host-Color "https://portal.azure.com/#@melodiehendersongmail.onmicrosoft.com/resource/subscriptions/ab57bda9-b1ed-4ca1-8755-1e137948cd9b/resourceGroups/benefits-chatbot-project/providers/Microsoft.Storage/storageAccounts/benefitschatbotdev/containers" Cyan
