$ErrorActionPreference = "Continue"

$raizBack = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $raizBack "logs"
$logFile = Join-Path $logDir "api-startup.log"
$pidFile = Join-Path $logDir "api.pid"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Escrever-Log {
  param([string]$Mensagem)
  $linha = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Mensagem
  Add-Content -Path $logFile -Value $linha
}

function Test-ApiEscutando {
  $conexao = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  return [bool]$conexao
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

if (Test-ApiEscutando) {
  Escrever-Log "API ja escutando na porta 3001; nada a fazer."
  exit 0
}

if (Test-Path $pidFile) {
  $pidSalvo = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($pidSalvo -and (Get-Process -Id $pidSalvo -ErrorAction SilentlyContinue)) {
    Escrever-Log "Processo da API ja registrado (PID $pidSalvo)."
    exit 0
  }
}

Escrever-Log "Aguardando rede e Tailscale..."
Start-Sleep -Seconds 15
Aguardar-Tailscale -SegundosMax 90

if (Test-ApiEscutando) {
  Escrever-Log "API iniciada por outro processo durante a espera."
  exit 0
}

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
  [System.Environment]::GetEnvironmentVariable("Path", "User")

Set-Location $raizBack

$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npm) {
  Escrever-Log "ERRO: npm nao encontrado no PATH."
  exit 1
}

Escrever-Log "Iniciando CRM JPTV API (start:boot)..."

$proc = Start-Process `
  -FilePath $npm.Source `
  -ArgumentList "run", "start:boot" `
  -WorkingDirectory $raizBack `
  -WindowStyle Hidden `
  -PassThru

if (-not $proc) {
  Escrever-Log "ERRO: falha ao iniciar processo da API."
  exit 1
}

Set-Content -Path $pidFile -Value $proc.Id
Escrever-Log "API iniciada em background (PID $($proc.Id)). Log: $logFile"
