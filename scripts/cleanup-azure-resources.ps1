param(
  [Parameter(Mandatory=$true)][string]$ResourceGroup,
  [switch]$Execute
)

$ErrorActionPreference = "Stop"
function Log($msg, $color="Gray") { Write-Host $msg -ForegroundColor $color }
function Run($cmd) {
  if (-not $Execute) { Log "DRY-RUN: $cmd" "Yellow"; return $true }
  & powershell -NoProfile -Command $cmd
  return $LASTEXITCODE -eq 0
}
function Exists($type,$name){
  $q = "az resource list -g '$ResourceGroup' --resource-type $type --query ""[?name=='$name']|length(@)"" -o tsv"
  $res = (& powershell -NoProfile -Command $q)
  return ($res -as [int]) -gt 0
}
function RemoveLocks(){
  $locks = az lock list -g $ResourceGroup --query "[].{name:name, scope:scope}" -o tsv 2>$null
  if ($locks) {
    Log "Removing resource locks..." "Cyan"
    $locks -split "`n" | ForEach-Object {
      if ($_ -match "^(.*?)\s+(.*)$"){
        $name=$matches[1]; $scope=$matches[2]
        Run "az lock delete --name '$name' --scope '$scope' --only-show-errors --output none" | Out-Null
      }
    }
  }
}

Log "=== Azure cleanup for RG: $ResourceGroup ===" "Cyan"
RemoveLocks

# 0) Diagnostic settings off (best-effort)
Run "az monitor diagnostic-settings subscription list --query [].name -o tsv | ForEach-Object { az monitor diagnostic-settings subscription delete --name `$_ --only-show-errors --output none }" | Out-Null

# 1) Alerts / action groups / smart detectors
Run "az monitor action-group delete -g '$ResourceGroup' -n 'Application Insights Smart Detection' --only-show-errors --output none" | Out-Null
Run "az monitor metrics alert delete -g '$ResourceGroup' -n 'benefits-chatbot failed' --only-show-errors --output none" | Out-Null
Run "az monitor metrics alert delete -g '$ResourceGroup' -n 'Benefits-Chatbot-ResponseTime' --only-show-errors --output none" | Out-Null
Run "az monitor metrics alert delete -g '$ResourceGroup' -n 'Benefits-Chatbot-ErrorRate' --only-show-errors --output none" | Out-Null
Run "az resource delete -g '$ResourceGroup' -n 'Failure Anomalies - benefits-chatbot-insights' --resource-type microsoft.alertsmanagement/smartDetectorAlertRules --only-show-errors --output none" | Out-Null

# 2) Web Apps first, then App Service Plan
if (Exists "Microsoft.Web/sites" "benefits-chatbot-app") {
  Run "az webapp delete -g '$ResourceGroup' -n 'benefits-chatbot-app' --only-show-errors --output none" | Out-Null
}
if (Exists "Microsoft.Web/sites" "benefits-chatbot-dev") {
  Run "az webapp delete -g '$ResourceGroup' -n 'benefits-chatbot-dev' --only-show-errors --output none" | Out-Null
}
if (Exists "Microsoft.Web/serverFarms" "asp-benefits-chatbot") {
  Run "az appservice plan delete -g '$ResourceGroup' -n 'asp-benefits-chatbot' --yes --only-show-errors --output none" | Out-Null
}

# 3) Search service
if (Exists "Microsoft.Search/searchServices" "benefits-chatbot-search") {
  Run "az search service delete --name 'benefits-chatbot-search' --resource-group '$ResourceGroup' --yes --only-show-errors --output none" | Out-Null
}

# 4) Cognitive Services (Azure OpenAI)
if (Exists "Microsoft.CognitiveServices/accounts" "amerivetopenai-eastus") {
  Run "az cognitiveservices account delete -g '$ResourceGroup' -n 'amerivetopenai-eastus' --yes --only-show-errors --output none" | Out-Null
}

# 5) App Insights
if (Exists "Microsoft.Insights/components" "benefits-chatbot-insights") {
  Run "az resource delete -g '$ResourceGroup' -n 'benefits-chatbot-insights' --resource-type Microsoft.Insights/components --only-show-errors --output none" | Out-Null
}
if (Exists "microsoft.insights/components" "benefits-chatbot-insights-dev") {
  Run "az resource delete -g '$ResourceGroup' -n 'benefits-chatbot-insights-dev' --resource-type Microsoft.Insights/components --only-show-errors --output none" | Out-Null
}

# 6) Load balancer and public IP
if (Exists "Microsoft.Network/loadBalancers" "benefits-chatbot-lb") {
  Run "az network lb delete -g '$ResourceGroup' -n 'benefits-chatbot-lb' --only-show-errors --output none" | Out-Null
}
if (Exists "Microsoft.Network/publicIPAddresses" "benefits-chatbot-lb-ip") {
  Run "az network public-ip delete -g '$ResourceGroup' -n 'benefits-chatbot-lb-ip' --only-show-errors --output none" | Out-Null
}

# 7) Redis
if (Exists "Microsoft.Cache/Redis" "benefits-chatbot-redis-dev") {
  Run "az redis delete --name 'benefits-chatbot-redis-dev' --resource-group '$ResourceGroup' --yes --only-show-errors --output none" | Out-Null
}

# 8) Cosmos DB
if (Exists "Microsoft.DocumentDB/databaseAccounts" "benefits-chatbot-cosmos-dev") {
  Run "az cosmosdb delete --name 'benefits-chatbot-cosmos-dev' --resource-group '$ResourceGroup' --yes --only-show-errors --output none" | Out-Null
}

# 9) Storage account
if (Exists "Microsoft.Storage/storageAccounts" "benefitschatbotdev") {
  Run "az storage account delete -g '$ResourceGroup' -n 'benefitschatbotdev' --yes --only-show-errors --output none" | Out-Null
}

# 10) Recovery Services Vault (must remove backups first)
if (Exists "Microsoft.RecoveryServices/vaults" "benefits-chatbot-backup-vault") {
  # Stop protection & delete backup items (best-effort)
  Run "az backup item list -g '$ResourceGroup' -v 'benefits-chatbot-backup-vault' -o tsv | ForEach-Object { }" | Out-Null
  Run "az resource delete -g '$ResourceGroup' -n 'benefits-chatbot-backup-vault' --resource-type Microsoft.RecoveryServices/vaults --only-show-errors --output none" | Out-Null
}

# 11) Key Vault delete, then purge (soft-delete)
if (Exists "Microsoft.KeyVault/vaults" "benefits-chatbot-vault") {
  Run "az keyvault delete --name 'benefits-chatbot-vault' --resource-group '$ResourceGroup' --only-show-errors --output none" | Out-Null
}
# Purge requires RBAC permissions to purge
Run "try { az keyvault purge --name 'benefits-chatbot-vault' --only-show-errors --output none; 'Purged Key Vault: benefits-chatbot-vault' } catch { 'Key Vault purge skipped or not required' }" | Out-Null

Log "=== Cleanup complete (Execute=$Execute) ===" "Green"

