param(
  [string]$Ip = "",
  [int]$Porta = 3001
)

$ErrorActionPreference = "Stop"

function Obter-IpRedeLocal {
  param([string]$Preferido)

  if ($Preferido) {
    return $Preferido
  }

  $candidatos = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.PrefixOrigin -ne 'WellKnown' -and
      $_.InterfaceAlias -notmatch 'Virtual|VPN|Loopback|Hyper-V|vEthernet|WSL'
    } |
    Sort-Object @{
      Expression = {
        if ($_.InterfaceAlias -match 'Wi-Fi|Wireless|WLAN') { 0 }
        elseif ($_.InterfaceAlias -match 'Ethernet|LAN') { 1 }
        else { 2 }
      }
    }

  $escolhido = $candidatos | Select-Object -First 1
  if (-not $escolhido) {
    Write-Error "Não foi possível detectar um IP da rede local. Informe com -Ip 192.168.x.x"
  }

  return $escolhido.IPAddress
}

$raizFront = Split-Path -Parent $PSScriptRoot
$arquivoEnv = Join-Path $raizFront "src\environments\environment.mobile.ts"

if (-not (Test-Path $arquivoEnv)) {
  Write-Error "Arquivo não encontrado: $arquivoEnv"
}

$ipRede = Obter-IpRedeLocal -Preferido $Ip
$apiUrl = "http://${ipRede}:${Porta}/api"

$conteudo = Get-Content $arquivoEnv -Raw
$conteudoAtualizado = [regex]::Replace(
  $conteudo,
  "apiUrl:\s*'[^']+'",
  "apiUrl: '$apiUrl'"
)

Set-Content -Path $arquivoEnv -Value $conteudoAtualizado -NoNewline

Write-Host ""
Write-Host "Mobile environment atualizado:" -ForegroundColor Green
Write-Host "  apiUrl = $apiUrl"
Write-Host ""
Write-Host "Proximos passos:"
Write-Host "  1. cd crm_back && npm run dev"
Write-Host "  2. cd crm_front && npm run cap:home"
Write-Host "  3. No Android Studio: Build > Build APK(s)"
Write-Host ""
Write-Host "Teste no tablet/navegador do celular:"
Write-Host "  http://${ipRede}:${Porta}/health"
Write-Host ""
