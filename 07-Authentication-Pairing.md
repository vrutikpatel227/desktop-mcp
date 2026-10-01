# 07 — Authentication & Device Pairing

## Authentication options
- API keys
- Personal access tokens
- OAuth 2.1 where applicable
- Device pairing
- Short-lived session tokens
- Token rotation
- Token revocation

## Pairing flow
1. Install Agent
2. Generate device identity
3. Open dashboard
4. Select Pair Device
5. Generate QR code or pairing code
6. User confirms
7. Device receives secure credentials
8. Connection becomes active

## Session security
Validate identity and session for every request. Prefer short-lived credentials and provide revocation.

## Multi-device identity
Track device ID, name, OS, agent version, last seen and connection status.

## Secret rule
Authentication material must never be exposed in normal MCP responses.