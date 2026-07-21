param(
  [string]$WwwDir = ""
)

$ErrorActionPreference = "Stop"

$raizFront = Split-Path -Parent $PSScriptRoot
$destino = if ($WwwDir) { $WwwDir } else { Join-Path $raizFront "www" }

if (-not (Test-Path $destino)) {
  Write-Error "Pasta www nao encontrada: $destino (rode ng build antes)"
}

$gradle = Join-Path $raizFront "android\app\build.gradle"
$versionName = "1.1"
if (Test-Path $gradle) {
  $match = Select-String -Path $gradle -Pattern 'versionName\s+"([^"]+)"' | Select-Object -First 1
  if ($match) {
    $versionName = $match.Matches[0].Groups[1].Value
  }
}

$buildId = Get-Date -Format "yyyyMMdd-HHmmss"
$payload = @{
  buildId   = $buildId
  version   = $versionName
  builtAt   = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json -Compress

Set-Content -Path (Join-Path $destino "version.json") -Value $payload -NoNewline

Write-Host "version.json gerado: buildId=$buildId version=$versionName"
