# 21 — Testing & Reliability

## Unit tests
Policy Engine, Path Validator, Command Validator, authentication, tool schemas.

## Integration tests
MCP -> Agent, MCP -> Filesystem, MCP -> PowerShell, MCP -> Browser, MCP -> Git.

## End-to-end test
AI request -> create project -> install dependencies -> run project -> browser open -> endpoint test -> stop project.

## Security testing
Test path traversal, command/shell injection, SSRF, auth bypass, authorization bypass, token theft, privilege escalation, rate-limit bypass, malicious clients, malformed arguments, large payloads and process abuse.

## Reliability target
Target tool success rate: at least 99% for valid supported operations.

## Reliability rules
Recover from agent disconnects, retry only safe operations, never blindly retry destructive operations, preserve audit logs, return structured errors and prevent duplicate execution where possible.