$ErrorActionPreference = "Stop"
Write-Host "Desktop MCP Server installer"
Write-Host "Node.js 20+ is required."
$node = node --version
if (-not $node) { throw "Node.js not found." }
Write-Host "Node: $node"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if (-not (Test-Path "node_modules")) { npm install }
if (-not (Test-Path "workspace")) { New-Item -ItemType Directory -Path "workspace" | Out-Null }
Write-Host "Dependencies installed."
Write-Host "Run: npm run doctor"
Write-Host "First-time pairing: scripts\\setup-agent.cmd"
Write-Host "Developer Agent: npm run dev:agent"
Write-Host "Dashboard build: npm --prefix apps/dashboard run build"
