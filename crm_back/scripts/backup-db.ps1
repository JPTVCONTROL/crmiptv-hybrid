param(
  [string]$Destino = "",
  [switch]$AbrirPasta
)

$ErrorActionPreference = "Stop"

$raiz = Split-Path -Parent $PSScriptRoot
$banco = Join-Path $raiz "prisma\dev.db"

if (-not (Test-Path $banco)) {
  Write-Error "Banco não encontrado: $banco"
}

if (-not $Destino) {
  $Destino = Join-Path $raiz "backups"
}

New-Item -ItemType Directory -Force -Path $Destino | Out-Null

$carimbo = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$arquivo = Join-Path $Destino "crm-jptv-$carimbo.db"

Copy-Item -Path $banco -Destination $arquivo -Force

Write-Host "Backup salvo em: $arquivo"

if ($AbrirPasta) {
  Start-Process explorer.exe $Destino
}
