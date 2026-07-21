$ErrorActionPreference = "Stop"

$nomeTarefa = "CRM JPTV API Watchdog"
$existente = Get-ScheduledTask -TaskName $nomeTarefa -ErrorAction SilentlyContinue

if (-not $existente) {
  Write-Host "Nenhum watchdog encontrado: $nomeTarefa"
  exit 0
}

Unregister-ScheduledTask -TaskName $nomeTarefa -Confirm:$false
Write-Host "Watchdog removido: $nomeTarefa" -ForegroundColor Green
