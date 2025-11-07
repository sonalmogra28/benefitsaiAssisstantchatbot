param(
  [ValidateSet('Diagnose','Heal','Auto')] [string]$Mode = 'Auto',

  # ENV — edit if yours differ
  [string]$Rg = 'benefits-chatbot-project',
  [string]$SearchName = 'amerivetsearch',
  [string]$IndexName = 'chunks_prod_v1',
  [string]$NextIndexName = 'chunks_prod_v2',
  [string]$CompanyId = 'amerivet',
  [string]$AOOEndpointEnv = 'AZURE_OPENAI_ENDPOINT',
  [string]$AOOMdlEmbedEnv = 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT',
  [string]$AOOMdlL1Env = 'AZURE_OPENAI_DEPLOYMENT_L1',
  [string]$AOOVerEnv = 'AZURE_OPENAI_API_VERSION',
  [string]$VercelProject = 'benefitsaichatbot-sm',
  [string]$ProdUrl = 'https://amerivetaibot.bcgenrolls.com',
  [string]$DebugConfigPath = '/api/debug/config',
  [string]$QaPath = '/api/qa'
)

$ErrorActionPreference = 'Stop'

function Write-Head($t){ Write-Host "`n==== $t ====" -ForegroundColor Cyan }
function Write-Ok($t){ Write-Host "  OK  $t" -ForegroundColor Green }
function Write-Bad($t){ Write-Host "  ERR $t" -ForegroundColor Red }
function Write-Warn($t){ Write-Host "  WARN $t" -ForegroundColor Yellow }

# ——— Helpers ———
function Get-VercelEnv([string]$name){
  $out = (vercel env ls production --confirm 2>$null) -join "`n"
  $line = ($out -split "`n") | Where-Object { $_ -match "^\s*$name\s" } | Select-Object -First 1
  if(-not $line){ return $null }
  return $true # value is encrypted; presence is what we assert here
}

function Set-VercelEnv([string]$name, [string]$value){
  # idempotent replace
  try { echo "y" | vercel env rm $name production --yes 2>$null | Out-Null } catch {}
  @"
$value
"@ | vercel env add $name production --quiet | Out-Null
}

function TrimAllCriticalVercelEnv(){
  Write-Head "Trim+Normalize Vercel env"
  $need = @($AOOEndpointEnv,$AOOMdlEmbedEnv,$AOOVerEnv,$AOOMdlL1Env,'AZURE_OPENAI_DEPLOYMENT_L2','AZURE_OPENAI_DEPLOYMENT_L3','AZURE_SEARCH_ENDPOINT','AZURE_SEARCH_INDEX_NAME')
  foreach($n in $need){
    $present = Get-VercelEnv $n
    if(-not $present){ Write-Warn "$n missing ⇒ creating placeholder if known"; }
    # fetch value from your local .env.production if present
    $local = $null
    $envFile = "$env:USERPROFILE\secrets\benefitsaichatbot-383\.env.production"
    if(Test-Path $envFile){
      $line = (Get-Content $envFile -Raw) -split "`n" | Where-Object { $_ -match "^\s*$n\s*=" } | Select-Object -First 1
      if($line){ $local = ($line -split "=",2)[1].Trim() }
    }
    if(-not $local){ continue }
    $clean = ($local -replace "[`r`n]+","").Trim()
    Set-VercelEnv $n $clean
    Write-Ok "$n normalized"
  }
}

function Get-EmbeddingDims([string]$deployment){
  # minimal mapping; extend if needed
  if($deployment -match 'text-embedding-3-large'){ return 3072 }
  if($deployment -match 'text-embedding-3-small'){ return 1536 }
  if($deployment -match 'text-embedding-ada-002'){ return 1536 }
  return 1536
}

function Get-DebugConfig(){
  try{
    $json = Invoke-RestMethod -Uri ($ProdUrl.TrimEnd('/') + $DebugConfigPath) -TimeoutSec 15
    return $json
  }catch{
    Write-Warn "debug/config not reachable; will proceed without it"
    return $null
  }
}

function Assert-AOAI-Deployments(){
  Write-Head "Azure OpenAI deployments"
  $acctName = $env:AZURE_OPENAI_ACCOUNT
  if(-not $acctName){ $acctName = 'amerivetopenai' }
  
  $list = az cognitiveservices account deployment list -g $Rg -n $acctName -o json 2>$null | ConvertFrom-Json
  if(-not $list){ throw "No Azure OpenAI deployments found" }
  $emb = $list | Where-Object { $_.properties.model.name -match 'text-embedding' }
  $chat = $list | Where-Object { $_.properties.model.name -match 'gpt|o[1-9]|gpt-4o' }
  if(-not $emb){ throw "No embedding deployment" }
  if(-not $chat){ Write-Warn "No chat deployment detected" } else { Write-Ok "chat deployment present" }
  $emb | ForEach-Object { Write-Ok "embedding: $($_.name) [$($_.properties.provisioningState)]" }
  return $emb[0].name
}

function Test-AOAI-Embedding([string]$deploy){
  Write-Head "Probe embeddings ($deploy)"
  $endpoint = $env:AZURE_OPENAI_ENDPOINT
  if(-not $endpoint){ throw "AZURE_OPENAI_ENDPOINT not set in local shell" }
  $api = $env:AZURE_OPENAI_API_VERSION; if(-not $api){ $api="2024-02-15-preview" }
  $headers = @{ 'api-key' = $env:AZURE_OPENAI_API_KEY; 'Content-Type'='application/json' }
  if(-not $headers.'api-key'){ Write-Warn "AZURE_OPENAI_API_KEY not in shell; skipping live probe"; return $true }
  try{
    $res = Invoke-RestMethod -Method Post -Uri "$endpoint/openai/deployments/$deploy/embeddings?api-version=$api" -Headers $headers -Body '{"input":"ping"}'
    $dim = $res.data[0].embedding.Count
    Write-Ok "embedding alive, dims=$dim"
    return $true
  }catch{
    Write-Bad "embedding probe failed: $($_.Exception.Message)"
    return $false
  }
}

function Get-SearchIndexInfo([string]$name){
  $idx = az search index show -g $Rg --service-name $SearchName --name $name -o json 2>$null | ConvertFrom-Json
  if(-not $idx){ throw "Index $name not found" }
  $dim = ($idx.fields | Where-Object { $_.type -eq 'Collection(Single)' -and $_.name -match 'vector|content_vector' } | Select-Object -First 1).vectorSearchDimensions
  $vfield = ($idx.fields | Where-Object { $_.vectorSearchDimensions -ne $null } | Select-Object -First 1).name
  $profiles = $idx.vectorSearch.profiles.name
  [pscustomobject]@{
    Name    = $idx.name
    VectorField = $vfield
    VectorDims  = $dim
    Profiles    = ($profiles -join ',')
    Semantic    = ($idx.semantic).configurations.name -join ','
  }
}

function Assert-ClientMatchesIndex([int]$expectedDims, [object]$idxInfo){
  if(-not $idxInfo.VectorDims){ throw "Index has no vector field with dimensions" }
  if($idxInfo.VectorDims -ne $expectedDims){
    throw "DIMENSION_MISMATCH: index=$($idxInfo.VectorDims) expected=$expectedDims"
  }
  Write-Ok "vector dims match ($expectedDims)"
}

function Probe-VectorQuery([string]$index,[string]$vectorField,[int]$k,[double[]]$vec){
  Write-Head "Probe vector search (pure vector)"
  $api="2024-07-01"
  $key = az search admin-key show -g $Rg -n $SearchName --query primaryKey -o tsv
  $body = @{
    "count" = $true
    "top" = 16
    "vectorQueries" = @(@{
      "kind"="vector"; "vector"=$vec; "k"=$k; "fields"=$vectorField; "exhaustive"=$false
    })
    "filter" = "company_id eq '$CompanyId'"
    "select" = "id,title,company_id"
  } | ConvertTo-Json -Depth 8
  $res = Invoke-RestMethod -Method Post -Uri "https://$SearchName.search.windows.net/indexes/$index/docs/search?api-version=$api" -Headers @{ 'api-key'=$key; 'Content-Type'='application/json' } -Body $body
  $cnt = $res.value.Count
  Write-Ok "vector hits=$cnt"
  return $cnt
}

function Get-ProbeEmbedding([string]$deploy){
  # minimal "benefits" vector; you only need length correctness
  $endpoint = $env:AZURE_OPENAI_ENDPOINT
  $api = $env:AZURE_OPENAI_API_VERSION
  if(-not $api){ $api="2024-02-15-preview" }
  $headers = @{ 'api-key' = $env:AZURE_OPENAI_API_KEY; 'Content-Type'='application/json' }
  $res = Invoke-RestMethod -Method Post -Uri "$endpoint/openai/deployments/$deploy/embeddings?api-version=$api" -Headers $headers -Body '{"input":"benefits"}'
  return ,$res.data[0].embedding
}

function Rebuild-Index-ToDims([string]$src,[string]$dst,[int]$dims){
  Write-Head "Blue/green create $dst with dims=$dims"
  $srcJson = az search index show -g $Rg --service-name $SearchName --name $src -o json 2>$null | ConvertFrom-Json
  # patch the first vector field dims
  foreach($f in $srcJson.fields){
    if($f.vectorSearchDimensions){ $f.vectorSearchDimensions = $dims }
  }
  $tmp = Join-Path $env:TEMP "idx-$dst.json"
  ($srcJson | ConvertTo-Json -Depth 100) | Set-Content -Encoding utf8 $tmp
  try {
    az search index create -g $Rg --service-name $SearchName --name $dst --content @"$tmp" | Out-Null
  } catch {
    az search index delete -g $Rg --service-name $SearchName --name $dst --yes 2>$null | Out-Null
    az search index create -g $Rg --service-name $SearchName --name $dst --content @"$tmp" | Out-Null
  }
  Write-Ok "$dst created"
}

function Reingest-And-Flip([string]$dst){
  Write-Head "Reingest → flip"
  pwsh -NoProfile -File .\scripts\upload-pdfs.ps1 -IndexName $dst
  Set-VercelEnv 'AZURE_SEARCH_INDEX_NAME' $dst
  vercel --prod --force | Out-Null
  Write-Ok "Deployed with AZURE_SEARCH_INDEX_NAME=$dst"
}

function Smoke(){
  Write-Head "Production smoke"
  $b = @{ query = "What are the dental benefits?"; companyId = $CompanyId } | ConvertTo-Json
  $resp = Invoke-RestMethod -Method Post -Uri ($ProdUrl.TrimEnd('/') + $QaPath) -ContentType 'application/json' -Body $b
  [pscustomobject]@{
    retrievalCount = $resp.metadata.retrievalCount
    groundingScore = $resp.metadata.groundingScore
    tier           = $resp.metadata.tier
    responseMs     = $resp.metadata.responseTime
  }
}

# ——— Flow ———
try{
  Write-Head "Phase 0 · normalize env in Vercel (CRLF/whitespace)"
  TrimAllCriticalVercelEnv()

  Write-Head "Phase 1 · read debug/config (optional)"
  $dbg = Get-DebugConfig
  $embedName = $null
  $expectedDims = $null
  if($dbg){
    $embedName = ($dbg.config.azureOpenAI.embeddingDeployment -replace "[`r`n]","").Trim()
    if(-not $embedName){ $embedName = $env:$AOOMdlEmbedEnv }
    $expectedDims = Get-EmbeddingDims $embedName
    Write-Ok "embedding deployment=$embedName expectedDims=$expectedDims"
  }

  if(-not $embedName){
    $embedName = Assert-AOAI-Deployments
    $expectedDims = Get-EmbeddingDims $embedName
  }

  $aoaiOk = Test-AOAI-Embedding $embedName
  if(-not $aoaiOk -and $Mode -eq 'Diagnose'){ throw "AOAI embedding unavailable" }

  Write-Head "Phase 2 · index schema check"
  $idx = Get-SearchIndexInfo $IndexName
  Write-Ok ("index: {0} field={1} dims={2} profiles={3}" -f $idx.Name,$idx.VectorField,$idx.VectorDims,$idx.Profiles)
  $dimMismatch = $false
  try{ Assert-ClientMatchesIndex $expectedDims $idx } catch { Write-Bad $_; $dimMismatch=$true }

  Write-Head "Phase 3 · vector probe"
  $vec = $null
  try { $vec = Get-ProbeEmbedding $embedName } catch { Write-Warn "probe embedding skipped (no key in shell)" }
  $hits = $null
  if($vec){ $hits = Probe-VectorQuery $IndexName $idx.VectorField 40 $vec }

  if($Mode -eq 'Diagnose'){
    Write-Head "Summary"
    Write-Host (@{
      index         = $idx
      expectedDims  = $expectedDims
      dimMismatch   = $dimMismatch
      vectorHits    = $hits
    } | ConvertTo-Json -Depth 8)
    exit 0
  }

  if($Mode -in @('Heal','Auto')){
    if($dimMismatch -or ($hits -lt 8)){
      Write-Warn "Healing: rebuild index with correct dims + reingest + flip"
      Rebuild-Index-ToDims $IndexName $NextIndexName $expectedDims
      Reingest-And-Flip $NextIndexName
    } else {
      Write-Ok "Schema and vector hits look healthy; redeploy to pick up trims"
      vercel --prod --force | Out-Null
    }
  }

  Write-Head "Phase 4 · smoke"
  $smoke = Smoke
  $ok = ($smoke.retrievalCount -ge 8 -and $smoke.groundingScore -ge 0.6)
  if($ok){ Write-Ok ("Smoke PASS " + ($smoke | ConvertTo-Json)) }
  else   { Write-Warn ("Smoke DEGRADED " + ($smoke | ConvertTo-Json)) }

  exit ( $ok ? 0 : 2 )
}
catch{
  Write-Bad $_
  exit 1
}
