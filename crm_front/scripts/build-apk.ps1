param(
  [ValidateSet('debug', 'release')]
  [string]$Variant = 'debug'
)

$ErrorActionPreference = "Stop"

$raizFront = Split-Path -Parent $PSScriptRoot
$androidDir = Join-Path $raizFront "android"
$jbr = "C:\Program Files\Android\Android Studio\jbr"

if (-not (Test-Path $jbr)) {
  Write-Error "JDK do Android Studio não encontrado em: $jbr"
}

$env:JAVA_HOME = $jbr
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Push-Location $androidDir
try {
  if ($Variant -eq 'release') {
    & .\gradlew.bat assembleRelease
    $apk = Join-Path $androidDir "app\build\outputs\apk\release\app-release-unsigned.apk"
  } else {
    & .\gradlew.bat assembleDebug
    $apk = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
  }

  if (-not (Test-Path $apk)) {
    Write-Error "APK não encontrado após o build: $apk"
  }

  $releasesDir = Join-Path (Split-Path -Parent $raizFront) "releases"
  New-Item -ItemType Directory -Force -Path $releasesDir | Out-Null

  $versionName = (Select-String -Path (Join-Path $androidDir "app\build.gradle") -Pattern 'versionName\s+"([^"]+)"').Matches[0].Groups[1].Value
  $dest = Join-Path $releasesDir "crm-jptv-v${versionName}-${Variant}.apk"
  Copy-Item $apk $dest -Force

  Write-Host ""
  Write-Host "APK gerado:" -ForegroundColor Green
  Write-Host "  $dest"
  Write-Host ""
} finally {
  Pop-Location
}
