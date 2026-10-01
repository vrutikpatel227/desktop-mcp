# 20 — APIs, Tool Schemas & Permissions

## Versioned internal APIs
Use endpoints such as:
/api/v1/devices
/api/v1/tools
/api/v1/policies
/api/v1/logs
/api/v1/sessions

The MCP protocol interface stays separate from internal REST/API concerns.

## Tool schema contract
Every tool must define name, description, inputSchema, riskLevel, requiredPermission and timeout.

## Permission model
filesystem.read / write / delete
terminal.execute / terminal.admin
browser.read / browser.interact
process.read / process.control
git.read / git.write
email.read / email.send
system.read / system.modify

## Permission behavior
Permissions are granular and user-controlled. The server checks the required permission before execution.

## Compatibility
Tools should be versioned. Breaking changes use a new version while deprecated tools expose replacement guidance.