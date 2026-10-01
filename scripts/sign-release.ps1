param(
  [Parameter(Mandatory=$true)][string]$Path,
  [Parameter(Mandatory=$true)][string]$CertificateThumbprint
)
$ErrorActionPreference = "Stop"

$signtool = Get-Command signtool.exe -ErrorAction SilentlyContinue
if (-not $signtool) { throw "signtool.exe not found. Install Windows SDK signing tools." }

& $signtool.Source sign /sha1 $CertificateThumbprint /fd SHA256 /tr http://timestamp.digicert.com $Path
if ($LASTEXITCODE -ne 0) { throw "Code signing failed." }

Write-Host "Signed: $Path"
