$ErrorActionPreference = "Continue"

. "$PSScriptRoot\_api-common.ps1"

$raizBack = Get-CrmApiRaizBack
$logDir = Ensure-CrmApiLogDir -RaizBack $raizBack
$logFile = Join-Path $logDir "api-startup.log"
$pidFile = Join-Path $logDir "api.pid"
$porta = Get-CrmApiPort -RaizBack $raizBack

function Escrever-Log {
  param([string]$Mensagem)
  Write-CrmApiStartupLog -Mensagem $Mensagem -LogFile $logFile
}

function Aguardar-Tailscale {
  param([int]$SegundosMax = 90)

  $cli = Get-Command tailscale -ErrorAction SilentlyContinue
  if (-not $cli) {
    Escrever-Log "Tailscale nao instalado; seguindo sem aguardar VPN."
    return
  }

  $tentativas = [math]::Max(1, [math]::Floor($SegundosMax / 5))
  for ($i = 0; $i -lt $tentativas; $i++) {
    $ip = & tailscale ip -4 2>$null
    if ($ip -match '^\d+\.\d+\.\d+\.\d+$') {
      Escrever-Log "Tailscale online: $($ip.Trim())"
      return
    }
    Start-Sleep -Seconds 5
  }

  Escrever-Log "Tailscale ainda nao conectou; iniciando API mesmo assim."
}

if (Test-CrmApiHealth -Porta $porta) {
  Escrever-Log "API ja online em $(Get-CrmApiHealthUrl -Porta $porta)."
  exit 0
}

if (Test-CrmApiPortListening -Porta $porta) {
  Escrever-Log "Porta $porta em uso, mas /health falhou; abortando boot automatico."
  exit 2
}

if (Test-Path $pidFile) {
  $pidSalvo = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($pidSalvo -and (Get-Process -Id $pidSalvo -ErrorAction SilentlyContinue)) {
    Escrever-Log "Processo da API ja registrado (PID $pidSalvo); aguardando /health..."
    if (Wait-CrmApiHealth -Porta $porta -SegundosMax 60) {
      Escrever-Log "API respondeu em /health apos PID existente."
      exit 0
    }
    Escrever-Log "PID $pidSalvo ativo, mas /health nao respondeu; continuando tentativa de boot."
  }
}

Escrever-Log "Aguardando rede e Tailscale..."
Start-Sleep -Seconds 15
Aguardar-Tailscale -SegundosMax 90

if (Test-CrmApiHealth -Porta $porta) {
  Escrever-Log "API ficou online durante a espera."
  exit 0
}

if (Test-CrmApiPortListening -Porta $porta) {
  Escrever-Log "Porta $porta ocupada apos espera; abortando."
  exit 2
}

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
  [System.Environment]::GetEnvironmentVariable("Path", "User")

Set-Location $raizBack

$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npm) {
  Escrever-Log "ERRO: npm nao encontrado no PATH."
  exit 1
}

Escrever-Log "Iniciando CRM JPTV API (start:boot) na porta $porta..."

$proc = Start-Process `
  -FilePath "cmd.exe" `
  -ArgumentList "/c", "npm run start:boot" `
  -WorkingDirectory $raizBack `
  -WindowStyle Hidden `
  -PassThru

if (-not $proc) {
  Escrever-Log "ERRO: falha ao iniciar processo da API."
  exit 1
}

Set-Content -Path $pidFile -Value $proc.Id
Escrever-Log "Processo iniciado (PID $($proc.Id)). Aguardando /health..."

if (Wait-CrmApiHealth -Porta $porta -SegundosMax 90) {
  Escrever-Log "API online em $(Get-CrmApiHealthUrl -Porta $porta) (PID $($proc.Id))."
  exit 0
}

Escrever-Log "ERRO: processo $($proc.Id) iniciado, mas /health nao respondeu em 90s."
exit 1
