$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
if (!(Test-Path -LiteralPath '.env.local')) { throw 'Copy .env.example to .env.local and configure it first.' }
if (!(Test-Path -LiteralPath '.next\BUILD_ID')) {
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
}
& npm.cmd start
