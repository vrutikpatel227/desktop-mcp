param(
  [Parameter(Mandatory=$true)][string]$Path,
  [string]$ExpectedSha256
)
$ErrorActionPreference = "Stop"

if (-not (Test-Path $Path)) { throw "Release file not found: $Path" }

$hash = (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLowerInvariant()
Write-Host "SHA256: $hash"

if ($ExpectedSha256 -and $hash -ne $ExpectedSha256.ToLowerInvariant()) {
  throw "SHA256 mismatch."
}

$sig = Get-AuthenticodeSignature -FilePath $Path
Write-Host "Signature: $($sig.Status)"
if ($sig.Status -ne 'Valid') { throw "Release signature is not valid." }

Write-Host "Release verification passed."
