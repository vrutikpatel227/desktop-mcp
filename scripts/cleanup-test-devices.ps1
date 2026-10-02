$ErrorActionPreference = "Stop"
$headers = @{ Authorization = "Bearer change-me-admin" }
$devices = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8790/api/devices" -Headers $headers
$testNames = @("E2E Remote Device", "Multi Device E2E", "Live Security E2E", "REMOTE-TEST-PC-2", "PACKAGED-REMOTE-TEST")

foreach ($device in $devices) {
  if ($testNames -contains $device.name -and -not $device.revoked) {
    try {
      $result = Invoke-RestMethod -Method Post -Uri ("http://127.0.0.1:8790/api/devices/" + $device.id + "/revoke") -Headers $headers
      Write-Output ($device.id + ": revoked=" + $result.revoked)
    } catch {
      Write-Output ($device.id + ": revoke failed")
    }
  }
}
Write-Output "Test-device cleanup complete."
