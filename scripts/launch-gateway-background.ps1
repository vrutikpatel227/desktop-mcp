$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$env:DESKTOP_MCP_GATEWAY_PORT = "8790"
$env:DESKTOP_MCP_ADMIN_TOKEN = "change-me-admin"
$env:DESKTOP_MCP_DATA_DIR = Join-Path $root "data"
if (-not (Test-Path $env:DESKTOP_MCP_DATA_DIR)) { New-Item -ItemType Directory -Path $env:DESKTOP_MCP_DATA_DIR | Out-Null }
$stdout = Join-Path $env:DESKTOP_MCP_DATA_DIR "gateway.stdout.log"
$stderr = Join-Path $env:DESKTOP_MCP_DATA_DIR "gateway.stderr.log"
Start-Process -FilePath "node.exe" -ArgumentList ".\node_modules\tsx\dist\cli.mjs .\apps\gateway\src\index.ts" -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
Write-Output "Gateway launched in background."
