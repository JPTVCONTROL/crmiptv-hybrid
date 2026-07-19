param(
  [string]$Destino = "",
  [switch]$AbrirPasta,
  [int]$RetencaoDias = 0
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

if ($RetencaoDias -gt 0) {
  $limite = (Get-Date).AddDays(-$RetencaoDias)
  $removidos = Get-ChildItem -Path $Destino -Filter "crm-jptv-*.db" -File |
    Where-Object { $_.LastWriteTime -lt $limite }

  foreach ($antigo in $removidos) {
    Remove-Item -Path $antigo.FullName -Force
    Write-Host "Backup antigo removido: $($antigo.Name)"
  }
}

if ($AbrirPasta) {
  Start-Process explorer.exe $Destino
}
