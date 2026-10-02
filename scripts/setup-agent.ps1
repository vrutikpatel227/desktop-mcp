param(
  [string]$GatewayUrl,
  [string]$PairCode,
  [string]$DeviceName,
  [string]$Workspace,
  [int]$AgentPort = 8788
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not $GatewayUrl) { $GatewayUrl = Read-Host 'Gateway URL (example: http://127.0.0.1:8790)' }
if (-not $GatewayUrl) { throw 'Gateway URL is required.' }
if (-not $PairCode) { $PairCode = Read-Host '6-digit pairing code from Devices page' }
if ($PairCode -notmatch '^[0-9]{6}$') { throw 'Pairing code must be 6 digits.' }
if (-not $DeviceName) { $DeviceName = if ($env:COMPUTERNAME) { $env:COMPUTERNAME } else { 'Desktop' } }
if (-not $Workspace) { $Workspace = Join-Path $env:USERPROFILE 'Desktop-MCP-Workspace' }
if ($AgentPort -lt 1024 -or $AgentPort -gt 65535) { throw 'AgentPort must be between 1024 and 65535.' }

$wsUrl = $GatewayUrl -replace '^https://', 'wss://' -replace '^http://', 'ws://'
$configDir = Join-Path $env:APPDATA 'DesktopMCP'
$configFile = Join-Path $configDir 'config.json'
New-Item -ItemType Directory -Path $configDir -Force | Out-Null
New-Item -ItemType Directory -Path $Workspace -Force | Out-Null

$config = @{
  gatewayUrl = $GatewayUrl
  gatewayWsUrl = ($wsUrl.TrimEnd('/') + '/agent')
  pairCode = $PairCode
  deviceName = $DeviceName
  workspace = $Workspace
}
$json = $config | ConvertTo-Json
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($configFile, $json, $utf8NoBom)

$env:DESKTOP_MCP_AGENT_TOKEN = 'change-me'
$env:DESKTOP_MCP_WORKSPACE = $Workspace
$env:DESKTOP_MCP_DATA_DIR = Join-Path $env:APPDATA 'DesktopMCP\data'
$env:DESKTOP_MCP_ALLOW_LOCAL_BROWSER = 'true'
$env:DESKTOP_MCP_GATEWAY_URL = $GatewayUrl
$env:DESKTOP_MCP_GATEWAY_WS_URL = ($wsUrl.TrimEnd('/') + '/agent')
$env:DESKTOP_MCP_PAIR_CODE = $PairCode
$env:DESKTOP_MCP_DEVICE_NAME = $DeviceName
$env:DESKTOP_MCP_AGENT_PORT = [string]$AgentPort

# Open the local Devices dashboard automatically.
Start-Process 'http://127.0.0.1:3001/devices'

Set-Location $root
$compiledAgent = Join-Path $root 'dist\apps\desktop-agent\src\index.js'
if (Test-Path $compiledAgent) {
  & node.exe $compiledAgent
} else {
  & npm.cmd run dev:agent
}



