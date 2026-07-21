param(
  [int]$IntervaloMinutos = 10
)

$ErrorActionPreference = "Stop"

$nomeTarefa = "CRM JPTV API Watchdog"
$scriptEnsure = Join-Path $PSScriptRoot "ensure-api.ps1"

if (-not (Test-Path $scriptEnsure)) {
  Write-Error "Script nao encontrado: $scriptEnsure"
}

$argumentos = "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$scriptEnsure`" -Silent"
$acao = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argumentos
$inicio = (Get-Date).AddMinutes(1)
$gatilho = New-ScheduledTaskTrigger `
  -Once `
  -At $inicio `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervaloMinutos) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$config = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

Register-ScheduledTask `
  -TaskName $nomeTarefa `
  -Action $acao `
  -Trigger $gatilho `
  -Settings $config `
  -Description "Verifica a cada ${IntervaloMinutos} min se a API do CRM JPTV esta online e reinicia se necessario." `
  -Force | Out-Null

Write-Host ""
Write-Host "Watchdog da API configurado." -ForegroundColor Green
Write-Host "  Tarefa: $nomeTarefa"
Write-Host "  Intervalo: a cada ${IntervaloMinutos} minutos"
Write-Host "  Script: $scriptEnsure -Silent"
Write-Host "  Log: crm_back\logs\api-ensure.log"
Write-Host ""
Write-Host "Teste manual: npm run api:ensure"
Write-Host "Remover: npm run api:watchdog:remove"
Write-Host ""
