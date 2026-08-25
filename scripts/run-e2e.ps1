$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$port = if ($env:PORT) { [int]$env:PORT } else { 3000 }
$baseUrl = if ($env:PLAYWRIGHT_BASE_URL) { $env:PLAYWRIGHT_BASE_URL } else { "http://localhost:$port" }
$nodeBin = (Get-Command node).Source
$nextCli = Join-Path $projectRoot 'node_modules\next\dist\bin\next'
$playwrightCli = Join-Path $projectRoot 'node_modules\.pnpm\@playwright+test@1.60.0\node_modules\@playwright\test\cli.js'

function Test-ServerReady {
  param([string]$Url)

  try {
    Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

$startedServer = $false
$server = $null

try {
  if (-not (Test-ServerReady $baseUrl)) {
    $server = Start-Process `
      -FilePath $nodeBin `
      -ArgumentList @($nextCli, 'dev', '--port', "$port") `
      -WorkingDirectory $projectRoot `
      -WindowStyle Hidden `
      -PassThru
    $startedServer = $true

    $deadline = (Get-Date).AddSeconds(120)
    while ((Get-Date) -lt $deadline) {
      if ($server.HasExited) {
        throw 'Next dev server exited early.'
      }

      if (Test-ServerReady $baseUrl) { break }
      Start-Sleep -Milliseconds 500
    }

    if (-not (Test-ServerReady $baseUrl)) {
      throw "Next dev server did not become ready at $baseUrl"
    }
  }

  $env:PLAYWRIGHT_BASE_URL = $baseUrl
  $env:PLAYWRIGHT_SKIP_WEBSERVER = '1'
  & $nodeBin $playwrightCli test --workers=1 @args
  exit $LASTEXITCODE
} finally {
  if ($startedServer -and $server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }
}
