$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$env:DESKTOP_MCP_AGENT_URL = "http://127.0.0.1:8788"
$env:DESKTOP_MCP_AGENT_TOKEN = "change-me"
$env:DASHBOARD_AUTH_USER = "dev"
$env:DASHBOARD_AUTH_PASSWORD = "dev"
$env:DESKTOP_MCP_WORKSPACE = Join-Path $root "workspace"
npm --prefix apps/dashboard run dev -- --port 3001
