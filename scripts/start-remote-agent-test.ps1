param(
  [Parameter(Mandatory=$true)][string]$PairCode,
  [string]$DeviceName = "Remote Agent Test",
  [int]$Port = 8888
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$env:DESKTOP_MCP_AGENT_PORT = [string]$Port
$env:DESKTOP_MCP_WORKSPACE = Join-Path $root "workspace\remote-test"
$env:DESKTOP_MCP_AGENT_TOKEN = if ($env:DESKTOP_MCP_AGENT_TOKEN) { $env:DESKTOP_MCP_AGENT_TOKEN } else { "change-me" }
$env:DESKTOP_MCP_GATEWAY_URL = if ($env:DESKTOP_MCP_GATEWAY_URL) { $env:DESKTOP_MCP_GATEWAY_URL } else { "http://127.0.0.1:8790" }
$env:DESKTOP_MCP_GATEWAY_WS_URL = if ($env:DESKTOP_MCP_GATEWAY_WS_URL) { $env:DESKTOP_MCP_GATEWAY_WS_URL } else { "ws://127.0.0.1:8790/agent" }
$env:DESKTOP_MCP_PAIR_CODE = $PairCode
$env:DESKTOP_MCP_DATA_DIR = Join-Path $root ("data\remote-test-" + $Port)
$env:DESKTOP_MCP_DEVICE_NAME = $DeviceName

if (-not (Test-Path $env:DESKTOP_MCP_WORKSPACE)) {
  New-Item -ItemType Directory -Path $env:DESKTOP_MCP_WORKSPACE | Out-Null
}

npm run dev:agent
