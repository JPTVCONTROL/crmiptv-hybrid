$ErrorActionPreference = "Stop"

$nomeTarefa = "CRM JPTV API ao Logon"
$existente = Get-ScheduledTask -TaskName $nomeTarefa -ErrorAction SilentlyContinue

if (-not $existente) {
  Write-Host "Nenhum agendamento encontrado: $nomeTarefa"
  exit 0
}

Unregister-ScheduledTask -TaskName $nomeTarefa -Confirm:$false
Write-Host "Agendamento removido: $nomeTarefa" -ForegroundColor Green
