param(
  [int]$AguardarSegundos = 90
)

$ErrorActionPreference = "Continue"

. "$PSScriptRoot\_api-common.ps1"

$raizBack = Get-CrmApiRaizBack
$logDir = Ensure-CrmApiLogDir -RaizBack $raizBack
$logFile = Join-Path $logDir "api-restart.log"
$pidFile = Join-Path $logDir "api.pid"
$porta = Get-CrmApiPort -RaizBack $raizBack

function Escrever {
  param([string]$Mensagem)
  Write-CrmApiStartupLog -Mensagem $Mensagem -LogFile $logFile
  Write-Host $Mensagem
}

Escrever "Reiniciando API na porta $porta..."

if (Test-CrmApiPortListening -Porta $porta) {
  Escrever "Encerrando processo(s) na porta $porta..."
  npx --yes kill-port $porta 2>$null | Out-Null
  Start-Sleep -Seconds 2
}

if (Test-Path $pidFile) {
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

$bootScript = Join-Path $PSScriptRoot "start-api-boot.ps1"
& powershell.exe -ExecutionPolicy Bypass -NoProfile -File $bootScript
$bootExit = $LASTEXITCODE

if ($bootExit -ne 0) {
  Escrever "start-api-boot.ps1 retornou codigo $bootExit"
  exit $bootExit
}

if (Wait-CrmApiHealth -Porta $porta -SegundosMax $AguardarSegundos) {
  Escrever "API online em $(Get-CrmApiHealthUrl -Porta $porta)"
  exit 0
}

Escrever "ERRO: API nao respondeu em /health apos ${AguardarSegundos}s"
exit 1
