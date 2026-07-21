param(
  [switch]$SkipStartup,
  [switch]$SkipWatchdog
)

$ErrorActionPreference = "Continue"

$raizBack = Split-Path -Parent $PSScriptRoot
$raizProjeto = Split-Path -Parent $raizBack

Write-Host ""
Write-Host "=== CRM JPTV - Estabilidade da API ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "1/4 Verificando API..." -ForegroundColor White
& powershell.exe -ExecutionPolicy Bypass -NoProfile -File (Join-Path $PSScriptRoot "api-health.ps1")
$statusApi = $LASTEXITCODE

if ($statusApi -eq 0) {
  Write-Host ""
} elseif ($statusApi -eq 1) {
  Write-Host ""
  Write-Host "   Tentando subir a API..." -ForegroundColor Yellow
  & powershell.exe -ExecutionPolicy Bypass -NoProfile -File (Join-Path $PSScriptRoot "ensure-api.ps1")
  Write-Host ""
}

if (-not $SkipStartup) {
  Write-Host "2/4 Instalando inicializacao ao logon..." -ForegroundColor White
  & powershell.exe -ExecutionPolicy Bypass -NoProfile -File (Join-Path $PSScriptRoot "schedule-api-startup-task.ps1")
} else {
  Write-Host "2/4 Inicializacao ao logon - ignorado (-SkipStartup)" -ForegroundColor DarkGray
}

if (-not $SkipWatchdog) {
  Write-Host "3/4 Instalando watchdog (verifica a cada 10 min)..." -ForegroundColor White
  & powershell.exe -ExecutionPolicy Bypass -NoProfile -File (Join-Path $PSScriptRoot "schedule-api-watchdog-task.ps1")
} else {
  Write-Host "3/4 Watchdog - ignorado (-SkipWatchdog)" -ForegroundColor DarkGray
}

Write-Host "4/4 Firewall (requer PowerShell como Administrador):" -ForegroundColor White
Write-Host "       cd $raizBack"
Write-Host "       npm run firewall:api"
Write-Host ""
Write-Host "Comandos uteis (raiz $raizProjeto):" -ForegroundColor Cyan
Write-Host "  npm run api:status   - verifica /health"
Write-Host "  npm run api:ensure   - sobe a API se estiver offline"
Write-Host "  npm run dev:back     - API em modo dev (terminal visivel)"
Write-Host ""
Write-Host "Logs:" -ForegroundColor Cyan
Write-Host "  crm_back\logs\api-startup.log"
Write-Host "  crm_back\logs\api-ensure.log"
Write-Host ""
