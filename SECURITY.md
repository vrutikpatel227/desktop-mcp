# Security Notes

## Development defaults
The local development agent binds to 127.0.0.1 and uses a development bearer token.

## Production requirements
Before remote deployment:
- Replace development credentials.
- Implement OAuth 2.1/device pairing with persistent storage.
- Add TLS and secure persistent transport.
- Harden SSRF protections.
- Use OS-backed secret storage.
- Add rate limiting and abuse controls.
- Add signed releases and verified updates.
- Run full security and E2E test suites.

## Workspace
Filesystem access is sandboxed to the configured workspace. Protected paths are rejected.

## Destructive actions
Critical operations are blocked by default. High-risk operations must require confirmation in the production human-in-the-loop layer.
