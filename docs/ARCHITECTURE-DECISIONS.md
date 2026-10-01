# Architecture Decisions

## ADR-001 — TypeScript MCP core
TypeScript is the primary implementation language for ecosystem compatibility and shared types.

## ADR-002 — MCP SDK v2
The server uses the v2 API with McpServer, registerTool and serveStdio.

## ADR-003 — Localhost Agent boundary
The MCP server does not execute OS operations directly. It calls the local Desktop Agent through authenticated loopback HTTP.

## ADR-004 — Workspace sandbox
Filesystem operations resolve against an approved workspace root.

## ADR-005 — Security before convenience
Risk classification and policy decisions happen before PowerShell execution.

## ADR-006 — Modular integrations
Browser, GitHub, email and remote connectivity remain separate modules so the core stays provider-neutral.
