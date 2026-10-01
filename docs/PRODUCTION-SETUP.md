# Production Setup

## 1. Local development

1. Install Node.js 20+.
2. Run npm install.
3. Copy .env.example to .env.
4. Set a non-default agent token and JWT secret.
5. Run scripts/start-agent-dev.ps1.
6. Run scripts/start-gateway-dev.ps1.
7. Run npm run doctor.
8. Use an MCP client with apps/mcp-server/src/index.ts or the Streamable HTTP gateway.

## 2. Dashboard

The dashboard runs on port 3001 in development examples.
Production requires:
- DASHBOARD_AUTH_USER
- DASHBOARD_AUTH_PASSWORD

The production dashboard refuses requests when authentication is not configured.

## 3. Remote devices

Create a pairing code from the authenticated gateway:
POST /api/pair/start

Complete pairing with:
POST /api/pair/complete

Store the returned device token securely on the agent. Device tokens are 30-day credentials and use token-version rotation.
## 4. Cloud deployment

Use deploy/docker-compose.yml as the baseline.
Required:
- PostgreSQL
- Redis
- HTTPS through Caddy or an equivalent trusted reverse proxy
- DESKTOP_MCP_DATABASE_URL
- REDIS_URL
- DESKTOP_MCP_ADMIN_TOKEN
- DESKTOP_MCP_JWT_SECRET
- DESKTOP_MCP_ISSUER using https://
- Dashboard authentication credentials

The gateway production startup gate rejects default credentials, missing PostgreSQL and non-HTTPS issuer configuration.

## 5. OIDC / SSO

Configure:
DESKTOP_MCP_OIDC_ISSUER
DESKTOP_MCP_OIDC_AUDIENCE
DESKTOP_MCP_OIDC_JWKS_URL

Optional OAuth approval-page credentials:
DESKTOP_MCP_OAUTH_USER
DESKTOP_MCP_OAUTH_PASSWORD

## 6. Integrations

GitHub uses GITHUB_TOKEN or encrypted secret github-token.
Gmail uses GMAIL_ACCESS_TOKEN or encrypted secret gmail-access-token.
Outlook uses OUTLOOK_ACCESS_TOKEN or encrypted secret outlook-access-token.

External writes remain disabled unless explicitly enabled and confirmed.
## 7. Release

Run scripts/build-release.ps1.
Sign Windows artifacts with scripts/sign-release.ps1.
Verify SHA-256 and Authenticode with scripts/verify-release.ps1.
Use scripts/update.ps1 for verified updates.

## 8. Operations

Monitor /health, /version and /metrics.
Review /api/audit for security and device activity.
Audit retention defaults to 30 days.
Use desktop-mcp emergency-stop for immediate local shutdown of managed execution.

## 9. Production checklist

Before exposing the gateway:
- Replace all example secrets.
- Configure TLS.
- Configure PostgreSQL backups.
- Configure Redis authentication/ACLs.
- Configure dashboard authentication or SSO.
- Test rollback.
- Run all security and E2E checks.
