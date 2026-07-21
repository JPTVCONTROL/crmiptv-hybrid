param(
  [int]$AtrasoSegundos = 45
)

$ErrorActionPreference = "Stop"

$nomeTarefa = "CRM JPTV API ao Logon"
$scriptBoot = Join-Path $PSScriptRoot "start-api-boot.ps1"

if (-not (Test-Path $scriptBoot)) {
  Write-Error "Script nao encontrado: $scriptBoot"
}

$argumentos = "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$scriptBoot`""
$acao = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argumentos
$gatilho = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$gatilho.Delay = "PT${AtrasoSegundos}S"

$config = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask `
  -TaskName $nomeTarefa `
  -Action $acao `
  -Trigger $gatilho `
  -Settings $config `
  -Description "Sobe a API do CRM JPTV ao entrar no Windows (Tailscale + APK remoto)." `
  -Force | Out-Null

Write-Host ""
Write-Host "Inicializacao automatica da API configurada." -ForegroundColor Green
Write-Host "  Tarefa: $nomeTarefa"
Write-Host "  Quando: ao logar no Windows (atraso ${AtrasoSegundos}s)"
Write-Host "  Script: $scriptBoot"
Write-Host "  Log: crm_back\logs\api-startup.log"
Write-Host ""
Write-Host "Teste manual: powershell -File scripts/start-api-boot.ps1"
Write-Host "Remover: npm run api:startup:remove"
Write-Host ""
