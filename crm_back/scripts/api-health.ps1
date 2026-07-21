param(
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\_api-common.ps1"

$raizBack = Get-CrmApiRaizBack
$porta = Get-CrmApiPort -RaizBack $raizBack
$url = Get-CrmApiHealthUrl -Porta $porta

if (Test-CrmApiHealth -Porta $porta) {
  if (-not $Quiet) {
    Write-Host "API online em $url" -ForegroundColor Green
  }
  exit 0
}

if (Test-CrmApiPortListening -Porta $porta) {
  if (-not $Quiet) {
    Write-Host "Porta $porta em uso, mas /health nao responde." -ForegroundColor Yellow
    Write-Host "Reinicie a API: npm run api:restart (crm_back) ou encerre o processo na porta $porta."
  }
  exit 2
}

if (-not $Quiet) {
  Write-Host "API offline (porta $porta)." -ForegroundColor Red
  Write-Host "Subir agora: npm run api:ensure (na raiz) ou npm run dev:back"
  Write-Host "Auto ao logar: npm run api:startup:install (crm_back)"
}

exit 1
