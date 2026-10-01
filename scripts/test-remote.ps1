$ErrorActionPreference = "Stop"
$token = "change-me-admin"
$h = @{ Authorization = "Bearer " + $token }
$devices = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8790/api/devices" -Headers $h
$devices | ConvertTo-Json -Compress
$device = $devices | Where-Object { $_.online -eq $true } | Select-Object -First 1
if (-not $device) { throw "No online paired device found" }
$payload = @{ operation = "system_info"; args = @{} } | ConvertTo-Json -Compress
$result = Invoke-RestMethod -Method Post -Uri ("http://127.0.0.1:8790/api/devices/" + $device.id + "/execute") -Headers $h -ContentType "application/json" -Body $payload
$result | ConvertTo-Json -Compress
