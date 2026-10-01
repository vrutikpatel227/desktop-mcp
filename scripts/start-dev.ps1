$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$env:DESKTOP_MCP_WORKSPACE = Join-Path $root "workspace"
$env:DESKTOP_MCP_AGENT_TOKEN = if ($env:DESKTOP_MCP_AGENT_TOKEN) { $env:DESKTOP_MCP_AGENT_TOKEN } else { "dev-local-change-me" }
$env:DESKTOP_MCP_AGENT_URL = "http://127.0.0.1:8788"

if (-not (Test-Path $env:DESKTOP_MCP_WORKSPACE)) {
  New-Item -ItemType Directory -Path $env:DESKTOP_MCP_WORKSPACE | Out-Null
}

Write-Host "Starting Desktop MCP Agent..."
Start-Process powershell -ArgumentList "-NoProfile -Command cd '$root'; npm run dev:agent"
Write-Host "Agent started on http://127.0.0.1:8788"
Write-Host "MCP server is launched by the MCP host/client over stdio."
