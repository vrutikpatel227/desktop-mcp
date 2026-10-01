# 02 — Architecture

## Production architecture
AI Client -> MCP Gateway/Server -> Auth -> Tool Registry -> Policy Engine -> Risk Engine -> Request Validator -> Audit Logger -> Execution Engine -> Desktop Agent -> User Machine.

## Components
- MCP Server
- Desktop Agent
- Execution Engine
- Policy Engine
- Authentication Service
- Audit System
- Optional Developer Dashboard
- Optional Cloud Gateway

## Security boundary
The MCP Server is the execution gateway and security boundary. AI clients never receive unrestricted operating-system access.

## Local mode
AI Client -> Local MCP Server -> Desktop Agent -> Computer.

## Remote mode
AI Client -> Remote MCP Gateway -> authenticated persistent connection -> Desktop Agent -> Computer.

Prefer a secure outbound WebSocket or equivalent persistent connection instead of arbitrary inbound router ports.

## Design goal
Keep the system modular so new tools and integrations can be added without rewriting the MCP core.