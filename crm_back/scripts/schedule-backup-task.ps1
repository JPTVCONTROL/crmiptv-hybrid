param(
  [string]$Horario = "02:00",
  [int]$RetencaoDias = 30
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
  Write-Host "ERRO: execute como Administrador para agendar o backup." -ForegroundColor Red
  Write-Host ""
  Write-Host "  cd C:\Projetos\crm-jptv\crm_back"
  Write-Host "  npm run db:backup:install"
  Write-Host ""
  exit 1
}

$nomeTarefa = "CRM JPTV Backup Diario"
$scriptBackup = Join-Path $PSScriptRoot "backup-db.ps1"

if (-not (Test-Path $scriptBackup)) {
  Write-Error "Script nao encontrado: $scriptBackup"
}

$argumentos = "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$scriptBackup`" -RetencaoDias $RetencaoDias"
$acao = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argumentos
$gatilho = New-ScheduledTaskTrigger -Daily -At $Horario
$config = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask `
  -TaskName $nomeTarefa `
  -Action $acao `
  -Trigger $gatilho `
  -Settings $config `
  -Description "Backup diario do SQLite do CRM JPTV (retencao ${RetencaoDias} dias)" `
  -Force | Out-Null

Write-Host ""
Write-Host "Backup automatico configurado." -ForegroundColor Green
Write-Host "  Tarefa: $nomeTarefa"
Write-Host "  Horario: todo dia as $Horario"
Write-Host "  Retencao: $RetencaoDias dias em crm_back\backups\"
Write-Host ""
Write-Host "Teste manual: npm run db:backup"
Write-Host "Remover agendamento: npm run db:backup:remove"
Write-Host ""
