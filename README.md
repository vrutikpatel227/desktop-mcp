# Desktop MCP Server

Universal Desktop MCP Server: an MCP control plane + local Windows Desktop Agent.

## Architecture
Any MCP client -> MCP Server -> authentication/policy -> Desktop Agent -> filesystem/process/browser/apps/Git/integrations.

Local mode uses stdio MCP transport. Remote mode uses the gateway with Streamable HTTP for MCP and an authenticated WebSocket agent channel.

## Implemented
- 57 MCP tools
- 1 MCP resource
- 1 reusable MCP prompt
- Workspace sandbox and path traversal protection
- Risk classification and policy enforcement
- Human confirmation gates and emergency stop
- Filesystem, PowerShell and managed process controls
- Git and GitHub integration
- Browser automation with Playwright + SSRF controls
- Project detection/creation/run workflows
- Application allowlist
- Encrypted secrets
- Gmail and Outlook adapters
- Device pairing, token rotation and multi-device routing
- OAuth/PKCE and OIDC verification hooks
- Dashboard with devices, tools, team/RBAC, settings, policy and audit views
- Metrics, audit storage, retention and CI/release tooling

## Development
Requirements: Node.js 20+.

Install:
`npm ci`

Run Agent (developer mode):
`npm run dev:agent`

First-time device setup (no `.env` editing): double-click `scripts/setup-agent.cmd`, enter the Gateway URL and the 6-digit pairing code from Dashboard → Devices. The agent stores its connection settings locally and securely saves the issued device credential after pairing.

Run local MCP server:
`npm run dev:server`

Run Gateway:
`npm run dev:gateway`

Run Dashboard:
`npm run dev:dashboard`

Health:
`npm run doctor`

## Verification
`npx tsc --noEmit`
`npx tsx --test tests/security.test.ts tests/extended.test.ts`
`npx tsx tests/smoke.ts`

Remote/OAuth/E2E and dashboard browser tests live in `tests/`.

## Production
Production mode requires non-default secrets, PostgreSQL, HTTPS/TLS or a trusted TLS proxy, and real identity/integration credentials. Do not expose development credentials or the local Agent port publicly.

See `SECURITY.md`, `docs/PRODUCTION-SETUP.md` and `deploy/RELEASE-CHECKLIST.md`.
