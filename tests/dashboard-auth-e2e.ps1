$ErrorActionPreference = "Stop"

$unauth = (& curl.exe -s -o NUL -w "%{http_code}" "http://127.0.0.1:3001/")
$auth = (& curl.exe -s -o NUL -w "%{http_code}" -u "e2e:e2e-local-only" "http://127.0.0.1:3001/")

if ($unauth -ne "401") { throw "Expected 401 without dashboard auth, got $unauth" }
if ($auth -ne "200") { throw "Expected 200 with dashboard auth, got $auth" }

Write-Host "DASHBOARD_AUTH_PASS unauth=401 auth=200"
