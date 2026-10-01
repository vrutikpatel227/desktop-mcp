param(
  [string]$GatewayUrl,
  [string]$PairCode,
  [string]$DeviceName,
  [string]$Workspace
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not $GatewayUrl) {
  $GatewayUrl = Read-Host 'Gateway URL (example: http://127.0.0.1:8790)'
}
if (-not $GatewayUrl) { throw 'Gateway URL is required.' }
if (-not $PairCode) {
  $PairCode = Read-Host '6-digit pairing code from Devices page'
}
if ($PairCode -notmatch '^[0-9]{6}$') { throw 'Pairing code must be 6 digits.' }

if (-not $DeviceName) {
  $DeviceName = if ($env:COMPUTERNAME) { $env:COMPUTERNAME } else { 'Desktop' }
}
if (-not $Workspace) {
  $Workspace = Join-Path $env:USERPROFILE 'Desktop-MCP-Workspace'
}

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
Write-Host ''
Write-Host 'Desktop MCP Agent setup saved.'
Write-Host ('Config: ' + $configFile)
Write-Host ('Device: ' + $DeviceName)
Write-Host ('Gateway: ' + $GatewayUrl)
Write-Host ''
Write-Host 'Starting agent. It will pair automatically and then store the device credential securely.'
$env:DESKTOP_MCP_AGENT_TOKEN = 'change-me'
$env:DESKTOP_MCP_WORKSPACE = $Workspace
$env:DESKTOP_MCP_DATA_DIR = Join-Path $env:APPDATA 'DesktopMCP\data'
$env:DESKTOP_MCP_ALLOW_LOCAL_BROWSER = 'true'
Set-Location $root
npm run dev:agent
