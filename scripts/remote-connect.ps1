param(
  [string]$GatewayUrl,
  [string]$PairCode,
  [string]$DeviceName,
  [string]$Workspace
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Write-Ok([string]$Text) {
  Write-Host "  [OK] $Text" -ForegroundColor Green
}

Clear-Host
Write-Host ""
Write-Host "  DESKTOP MCP REMOTE" -ForegroundColor Blue
Write-Host "  Remote Desktop Agent Connector" -ForegroundColor DarkGray
Write-Host "  --------------------------------" -ForegroundColor DarkGray
Write-Host ""

if (-not $GatewayUrl) {
  $GatewayUrl = Read-Host "  Gateway URL [http://127.0.0.1:8790]"
}
if (-not $GatewayUrl) { $GatewayUrl = "http://127.0.0.1:8790" }

if (-not $PairCode) {
  $PairCode = Read-Host "  6-digit Pairing Code"
}
if ($PairCode -notmatch '^[0-9]{6}$') {
  throw "Pairing code must be exactly 6 digits."
}

if (-not $DeviceName) {
  $defaultName = if ($env:COMPUTERNAME) { $env:COMPUTERNAME } else { "Desktop" }
  $DeviceName = Read-Host "  Device Name [$defaultName]"
  if (-not $DeviceName) { $DeviceName = $defaultName }
}

if (-not $Workspace) {
  $Workspace = Join-Path $env:USERPROFILE "Desktop-MCP-Workspace"
}

$configDir = Join-Path $env:APPDATA "DesktopMCP"
$configFile = Join-Path $configDir "config.json"
$wsUrl = $GatewayUrl -replace '^https://', 'wss://' -replace '^http://', 'ws://'
$wsUrl = $wsUrl.TrimEnd('/') + '/agent'

New-Item -ItemType Directory -Path $configDir -Force | Out-Null
New-Item -ItemType Directory -Path $Workspace -Force | Out-Null

$config = @{
  gatewayUrl = $GatewayUrl
  gatewayWsUrl = $wsUrl
  pairCode = $PairCode
  deviceName = $DeviceName
  workspace = $Workspace
}

$config | ConvertTo-Json | Set-Content -Path $configFile -Encoding UTF8

Write-Host ""
Write-Host "  CONNECTION" -ForegroundColor Cyan
Write-Host "  Gateway : $GatewayUrl"
Write-Host "  Device  : $DeviceName"
Write-Host ""

Write-Ok "Configuration saved"
Write-Host "  Connecting to Desktop MCP Gateway..." -ForegroundColor Yellow
Write-Host ""

$env:DESKTOP_MCP_AGENT_TOKEN = if ($env:DESKTOP_MCP_AGENT_TOKEN) { $env:DESKTOP_MCP_AGENT_TOKEN } else { "change-me" }
$env:DESKTOP_MCP_WORKSPACE = $Workspace
$env:DESKTOP_MCP_DATA_DIR = Join-Path $env:APPDATA "DesktopMCP\data"
$env:DESKTOP_MCP_GATEWAY_URL = $GatewayUrl
$env:DESKTOP_MCP_GATEWAY_WS_URL = $wsUrl
$env:DESKTOP_MCP_PAIR_CODE = $PairCode
$env:DESKTOP_MCP_DEVICE_NAME = $DeviceName

Set-Location $root

try {
  $compiledAgent = Join-Path $root "dist\apps\desktop-agent\src\index.js"
  if (Test-Path $compiledAgent) {
    node $compiledAgent
  } else {
    npm run dev:agent
  }
  Write-Host ""
  Write-Ok "Remote agent stopped."
}
catch {
  Write-Host ""
  Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
