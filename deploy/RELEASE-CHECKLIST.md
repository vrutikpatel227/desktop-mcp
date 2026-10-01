# Release Checklist

## Build
- npm ci
- npx tsc --noEmit
- security tests pass
- remote E2E pass
- dashboard build pass

## Security
- production JWT secret configured
- admin token replaced
- TLS enabled or a trusted TLS reverse proxy terminates HTTPS
- PostgreSQL credentials replaced
- Redis ACL/password configured
- external writes explicitly enabled only when needed
- signed installer verified
- release SHA256 verified

## Operations
- database backups
- Redis persistence/eviction policy
- log rotation
- audit retention
- health checks
- monitoring and alerting
- emergency-stop procedure

## Rollback
Keep the previous signed agent build available and verify rollback before release.
