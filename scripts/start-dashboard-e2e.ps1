$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$env:NODE_ENV = "production"
$env:DESKTOP_MCP_GATEWAY_URL = "http://127.0.0.1:8790"
$env:DESKTOP_MCP_ADMIN_TOKEN = "change-me-admin"
$env:DESKTOP_MCP_WORKSPACE = Join-Path $root "workspace"
$env:DASHBOARD_AUTH_USER = "e2e"
$env:DASHBOARD_AUTH_PASSWORD = "e2e-local-only"
npm --prefix apps/dashboard start -- --port 3001
