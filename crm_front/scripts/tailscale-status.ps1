$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=== CRM JPTV - Tailscale ===" -ForegroundColor Cyan
Write-Host ""

$cli = Get-Command tailscale -ErrorAction SilentlyContinue
if (-not $cli) {
  Write-Host "Status: Tailscale NAO instalado" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "1. Baixe e instale: https://tailscale.com/download/windows"
  Write-Host "2. Abra o Tailscale, faca login e conecte este PC"
  Write-Host "3. Instale o app Tailscale no celular (mesma conta)"
  Write-Host "4. Rode: cd crm_front; npm run mobile:prepare:tailscale"
  Write-Host ""
  exit 1
}

Write-Host "CLI: $($cli.Source)" -ForegroundColor Green
Write-Host ""
Write-Host "--- tailscale status ---" -ForegroundColor DarkGray
& tailscale status
Write-Host ""
Write-Host "--- IP Tailscale (IPv4) ---" -ForegroundColor DarkGray
$ip = & tailscale ip -4 2>$null
if ($ip) {
  Write-Host "  $ip" -ForegroundColor Green
  Write-Host ""
  Write-Host "Teste local:  http://localhost:3001/health"
  Write-Host "Teste remoto: http://${ip}:3001/health  (celular com Tailscale, fora de casa)"
} else {
  Write-Host "  (nao conectado - abra o Tailscale e faca login)" -ForegroundColor Yellow
}
Write-Host ""
