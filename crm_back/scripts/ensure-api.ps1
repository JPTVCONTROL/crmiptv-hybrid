param(
  [switch]$Silent,
  [int]$AguardarSegundos = 90
)

$ErrorActionPreference = "Continue"

. "$PSScriptRoot\_api-common.ps1"

$raizBack = Get-CrmApiRaizBack
$logDir = Ensure-CrmApiLogDir -RaizBack $raizBack
$logFile = Join-Path $logDir "api-ensure.log"
$porta = Get-CrmApiPort -RaizBack $raizBack
$url = Get-CrmApiHealthUrl -Porta $porta

function Escrever {
  param(
    [string]$Mensagem,
    [switch]$SomenteLog
  )

  Write-CrmApiStartupLog -Mensagem $Mensagem -LogFile $logFile

  if (-not $Silent -and -not $SomenteLog) {
    Write-Host $Mensagem
  }
}

if (Test-CrmApiHealth -Porta $porta) {
  if (-not $Silent) {
    Write-Host "API ja online em $url" -ForegroundColor Green
  }
  exit 0
}

if (Test-CrmApiPortListening -Porta $porta) {
  Escrever "Porta $porta em uso, mas /health falhou. Nao iniciando segunda instancia."
  if (-not $Silent) {
    Write-Host "Porta $porta ocupada sem resposta em /health." -ForegroundColor Yellow
    Write-Host "Encerre o processo conflitante ou reinicie o PC, depois rode npm run api:ensure."
  }
  exit 2
}

Escrever "API offline; executando start-api-boot.ps1..."
$bootScript = Join-Path $PSScriptRoot "start-api-boot.ps1"

if (-not (Test-Path $bootScript)) {
  Escrever "ERRO: script nao encontrado: $bootScript"
  exit 1
}

& powershell.exe -ExecutionPolicy Bypass -NoProfile -File $bootScript
$bootExit = $LASTEXITCODE

if ($bootExit -ne 0) {
  Escrever "start-api-boot.ps1 retornou codigo $bootExit"
  exit $bootExit
}

Escrever "Aguardando /health (ate ${AguardarSegundos}s)..."

if (Wait-CrmApiHealth -Porta $porta -SegundosMax $AguardarSegundos) {
  Escrever "API online em $url"
  if (-not $Silent) {
    Write-Host "API online em $url" -ForegroundColor Green
  }
  exit 0
}

Escrever "ERRO: API nao respondeu em /health apos ${AguardarSegundos}s. Veja logs\api-startup.log"
if (-not $Silent) {
  Write-Host "API nao respondeu a tempo. Verifique crm_back\logs\api-startup.log" -ForegroundColor Red
}
exit 1
