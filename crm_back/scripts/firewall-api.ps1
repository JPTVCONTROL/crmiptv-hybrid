param(
  [int]$Porta = 3001,
  [string]$NomeRegra = "CRM JPTV API"
)

$ErrorActionPreference = "Stop"

function Test-Administrador {
  $principal = New-Object Security.Principal.WindowsPrincipal(
    [Security.Principal.WindowsIdentity]::GetCurrent()
  )
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrador)) {
  Write-Host ""
  Write-Host "ERRO: este script precisa ser executado como Administrador." -ForegroundColor Red
  Write-Host ""
  Write-Host "Como resolver:"
  Write-Host "  1. Feche este terminal"
  Write-Host "  2. Clique com botao direito em PowerShell ou Terminal"
  Write-Host "  3. Escolha 'Executar como administrador'"
  Write-Host "  4. Rode:"
  Write-Host "       cd C:\Projetos\crm-jptv\crm_back"
  Write-Host "       npm run firewall:api"
  Write-Host ""
  Write-Host "Alternativa manual:"
  Write-Host "  Configuracoes > Rede e Internet > Firewall > Regras de entrada"
  Write-Host "  Nova regra > Porta > TCP $Porta > Permitir > Dominio, Privada e Publica"
  Write-Host ""
  Write-Host "Dica: se a rede Ethernet/Wi-Fi estiver como 'Publica', regras so para 'Privada' nao funcionam."
  Write-Host ""
  exit 1
}

$existente = Get-NetFirewallRule -DisplayName $NomeRegra -ErrorAction SilentlyContinue
if ($existente) {
  Set-NetFirewallRule -DisplayName $NomeRegra -Profile Domain, Private, Public -Enabled True | Out-Null
  Write-Host "Regra de firewall atualizada: $NomeRegra (Dominio, Privada e Publica)" -ForegroundColor Green
  exit 0
}

Write-Host "Criando regra de firewall para porta TCP $Porta (Dominio, Privada e Publica)..."

New-NetFirewallRule `
  -DisplayName $NomeRegra `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort $Porta `
  -Profile Domain, Private, Public `
  | Out-Null

Write-Host ""
Write-Host "Regra criada com sucesso." -ForegroundColor Green
Write-Host "Tablets na mesma Wi-Fi podem acessar http://SEU_IP:${Porta}/health"
Write-Host ""
