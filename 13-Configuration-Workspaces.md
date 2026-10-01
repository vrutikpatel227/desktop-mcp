# 13 — Configuration & Workspaces

## Example configuration
server.name: universal-desktop-mcp
server.host: 127.0.0.1
server.port: 8787
security.authentication: required
security.confirmation_mode: smart
workspace.root: C:/AI-Workspace
execution.shell: powershell
execution.timeout: 120
logging.enabled: true
logging.retention_days: 30
browser.enabled: true
git.enabled: true
github.enabled: false
email.enabled: false

## Workspace profiles
Users may create multiple workspaces, for example Personal, Code projects and College projects.

## Access model
Default workspace is sandboxed. Additional paths require explicit user permission.

## Operational goal
AI can select the correct workspace without granting unrestricted disk access.