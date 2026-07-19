$ErrorActionPreference = "Stop"

function Test-Administrador {
  $principal = New-Object Security.Principal.WindowsPrincipal(
    [Security.Principal.WindowsIdentity]::GetCurrent()
  )
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

$nomeTarefa = "CRM JPTV Backup Diario"
$existente = Get-ScheduledTask -TaskName $nomeTarefa -ErrorAction SilentlyContinue

if (-not $existente) {
  Write-Host "Nenhum agendamento encontrado: $nomeTarefa"
  exit 0
}

if (-not (Test-Administrador)) {
  Write-Host "ERRO: execute como Administrador para remover o agendamento." -ForegroundColor Red
  exit 1
}

Unregister-ScheduledTask -TaskName $nomeTarefa -Confirm:$false
Write-Host "Agendamento removido: $nomeTarefa" -ForegroundColor Green
