# Desktop MCP Server

Production-oriented Universal Desktop MCP Server scaffold.

## Runtime
- Node.js 20+
- TypeScript
- MCP TypeScript SDK v2
- Local Desktop Agent
- Windows-first design

## Start
1. Copy .env.example to .env and set values.
2. Install dependencies with npm install.
3. Start the agent: npm run dev:agent
4. Start MCP server: npm run dev:server
5. Run checks: npm run doctor

## Current implementation
Core filesystem, system information, PowerShell execution policy, process listing, audit logging, authentication between MCP server and local agent, and a CLI doctor.

## Security model
The agent exposes only approved operations and enforces a workspace boundary. High-risk command classes are denied by default.
