$ErrorActionPreference = "Stop"
$headers = @{ Authorization = "Bearer change-me-admin" }
$result = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8790/api/pair/start" -Headers $headers
$result | ConvertTo-Json -Compress
