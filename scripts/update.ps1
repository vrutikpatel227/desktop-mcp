param(
  [Parameter(Mandatory=$true)][string]$ReleaseUrl,
  [Parameter(Mandatory=$true)][string]$ExpectedSha256
)
$ErrorActionPreference = "Stop"

$temp = Join-Path $env:TEMP "desktop-mcp-update.exe"
Invoke-WebRequest -UseBasicParsing -Uri $ReleaseUrl -OutFile $temp

$actual = (Get-FileHash -Algorithm SHA256 -Path $temp).Hash
if ($actual.ToLowerInvariant() -ne $ExpectedSha256.ToLowerInvariant()) {
  Remove-Item $temp -Force
  throw "Update hash verification failed."
}

$sig = Get-AuthenticodeSignature -FilePath $temp
if ($sig.Status -ne 'Valid') {
  Remove-Item $temp -Force
  throw "Update signature verification failed."
}

Write-Host "Verified release. Start installer manually or use your deployment service."
Start-Process -FilePath $temp -ArgumentList "/quiet" -Wait
Remove-Item $temp -Force
Write-Host "Update complete."
