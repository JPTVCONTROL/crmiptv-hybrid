param(
  [string]$Ip = "",
  [int]$Porta = 3001,
  [switch]$Tailscale
)

$ErrorActionPreference = "Stop"

function Obter-IpTailscale {
  $cli = Get-Command tailscale -ErrorAction SilentlyContinue
  if (-not $cli) {
    return $null
  }

  $ip = & tailscale ip -4 2>$null
  if ($ip -match '^\s*(\d+\.\d+\.\d+\.\d+)\s*$') {
    return $Matches[1]
  }

  return $null
}

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

$modo = if ($Tailscale) { 'tailscale' } else { 'rede-local' }

if ($Tailscale) {
  $ipRede = if ($Ip) { $Ip } else { Obter-IpTailscale }
  if (-not $ipRede) {
    Write-Host ""
    Write-Host "Tailscale não encontrado ou não conectado." -ForegroundColor Red
    Write-Host ""
    Write-Host "Passos:"
    Write-Host "  1. Instale: https://tailscale.com/download/windows"
    Write-Host "  2. Entre com Google/Microsoft/GitHub e conecte este PC"
    Write-Host "  3. Rode de novo: npm run mobile:prepare:tailscale"
    Write-Host ""
    Write-Host "Ou informe o IP manualmente:"
    Write-Host "  powershell -File scripts/prepare-mobile-env.ps1 -Tailscale -Ip 100.x.x.x"
    Write-Host ""
    exit 1
  }
} else {
  $ipRede = Obter-IpRedeLocal -Preferido $Ip
}

$apiUrl = "http://${ipRede}:${Porta}/api"
$healthUrl = "http://${ipRede}:${Porta}/health"

$conteudo = Get-Content $arquivoEnv -Raw
$conteudoAtualizado = [regex]::Replace(
  $conteudo,
  "apiUrl:\s*'[^']+'",
  "apiUrl: '$apiUrl'"
)
$conteudoAtualizado = [regex]::Replace(
  $conteudoAtualizado,
  "healthUrl:\s*'[^']+'",
  "healthUrl: '$healthUrl'"
)

Set-Content -Path $arquivoEnv -Value $conteudoAtualizado -NoNewline

Write-Host ""
Write-Host "Mobile environment atualizado ($modo):" -ForegroundColor Green
Write-Host "  apiUrl = $apiUrl"
Write-Host "  healthUrl = $healthUrl"
Write-Host ""

if ($Tailscale) {
  Write-Host "Acesso fora de casa:"
  Write-Host "  - Celular/tablet com Tailscale logado na MESMA conta"
  Write-Host "  - PC em casa ligado com npm run dev:back"
  Write-Host "  - Teste no celular (4G ou outra Wi-Fi): $healthUrl"
  Write-Host ""
  Write-Host "Proximos passos:"
  Write-Host "  1. cd crm_front && npm run apk:tailscale"
  Write-Host ""
} else {
  Write-Host "Proximos passos:"
  Write-Host "  1. cd crm_back && npm run dev"
  Write-Host "  2. cd crm_front && npm run cap:home"
  Write-Host "  3. No Android Studio: Build > Build APK(s)"
  Write-Host ""
  Write-Host "Teste no tablet/navegador do celular (mesma Wi-Fi):"
  Write-Host "  $healthUrl"
  Write-Host ""
}
