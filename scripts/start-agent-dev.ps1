$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$env:DESKTOP_MCP_AGENT_TOKEN = 'change-me'
$env:DESKTOP_MCP_WORKSPACE = Join-Path $root 'workspace'
if (-not (Test-Path $env:DESKTOP_MCP_WORKSPACE)) { New-Item -ItemType Directory -Path $env:DESKTOP_MCP_WORKSPACE | Out-Null }
npm run dev:agent
