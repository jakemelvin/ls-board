[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$VpsHost,
  [Parameter(Mandatory)]
  [string]$VpsUser,
  [Parameter(Mandatory)]
  [string]$VpsPath,
  [ValidateSet('native', 'docker')]
  [string]$Mode = 'docker'
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
  throw 'OpenSSH client is required. Install the Windows OpenSSH Client, then retry.'
}
if (-not $VpsPath.StartsWith('/')) {
  throw 'VpsPath must be an absolute Linux path, for example /opt/sendamhub-ls-board.'
}
if ($VpsPath.Contains("'")) {
  throw 'VpsPath cannot contain an apostrophe.'
}

$remoteScript = if ($Mode -eq 'docker') { 'scripts/deploy-docker.sh' } else { 'scripts/deploy-vps.sh' }
$remoteCommand = "cd -- '$VpsPath' && git pull --ff-only && bash $remoteScript"

Write-Host "Deploying $Mode mode to $VpsUser@$VpsHost..." -ForegroundColor Cyan
& ssh "$VpsUser@$VpsHost" $remoteCommand
if ($LASTEXITCODE -ne 0) {
  throw "The VPS deployment failed (exit code $LASTEXITCODE)."
}

Write-Host 'VPS deployment completed successfully.' -ForegroundColor Green
