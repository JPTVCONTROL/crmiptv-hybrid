function Get-CrmApiRaizBack {
  return Split-Path -Parent $PSScriptRoot
}

function Get-CrmApiPort {
  param([string]$RaizBack = (Get-CrmApiRaizBack))

  $porta = 3001
  $envFile = Join-Path $RaizBack ".env"

  if (Test-Path $envFile) {
    Get-Content $envFile -ErrorAction SilentlyContinue | ForEach-Object {
      if ($_ -match '^\s*PORT\s*=\s*(\d+)\s*$') {
        $porta = [int]$Matches[1]
      }
    }
  }

  return $porta
}

function Get-CrmApiHealthUrl {
  param(
    [int]$Porta,
    [string]$HostName = "127.0.0.1"
  )

  return "http://${HostName}:${Porta}/health"
}

function Test-CrmApiPortListening {
  param([int]$Porta = (Get-CrmApiPort))

  $conexao = Get-NetTCPConnection -LocalPort $Porta -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1

  return [bool]$conexao
}

function Test-CrmApiHealth {
  param(
    [int]$Porta = (Get-CrmApiPort),
    [int]$TimeoutSec = 4
  )

  try {
    $uri = Get-CrmApiHealthUrl -Porta $Porta
    $resp = Invoke-RestMethod -Uri $uri -TimeoutSec $TimeoutSec -ErrorAction Stop
    return $resp.success -eq $true
  } catch {
    return $false
  }
}

function Wait-CrmApiHealth {
  param(
    [int]$Porta = (Get-CrmApiPort),
    [int]$SegundosMax = 90,
    [int]$IntervaloSeg = 2
  )

  $tentativas = [math]::Max(1, [math]::Floor($SegundosMax / $IntervaloSeg))

  for ($i = 0; $i -lt $tentativas; $i++) {
    if (Test-CrmApiHealth -Porta $Porta) {
      return $true
    }

    Start-Sleep -Seconds $IntervaloSeg
  }

  return $false
}

function Write-CrmApiStartupLog {
  param(
    [string]$Mensagem,
    [string]$LogFile
  )

  $linha = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Mensagem
  Add-Content -Path $LogFile -Value $linha
}

function Ensure-CrmApiLogDir {
  param([string]$RaizBack = (Get-CrmApiRaizBack))

  $logDir = Join-Path $RaizBack "logs"
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  return $logDir
}
