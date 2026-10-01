$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$release = Join-Path $root "release"

function Invoke-Checked([string]$Label, [scriptblock]$Command) {
  Write-Host "==> $Label"
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE."
  }
}

if (Test-Path $release) { Remove-Item $release -Recurse -Force }
New-Item -ItemType Directory -Path $release | Out-Null

Invoke-Checked "npm ci" { npm ci }
Invoke-Checked "TypeScript" { npx tsc --noEmit }
Invoke-Checked "Security tests" { npx tsx --test tests/security.test.ts tests/extended.test.ts }
Invoke-Checked "Dashboard production build" { npm --prefix apps/dashboard run build }

Write-Host "Build verification passed."
Write-Host "Release folder: $release"
Write-Host "Sign installer/release artifacts before distribution."
