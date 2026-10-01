# 23 — Deployment, Scalability & Versioning

## Cloud deployment
Possible architecture: Cloud MCP Gateway -> PostgreSQL -> Redis -> WebSocket Gateway -> Desktop Agents.

## Local deployment
Desktop machine can run both MCP Server and Desktop Agent.

## Scalability
Support 1 user/1 device, 1 user/10 devices and enterprise fleets of 1,000+ devices as architecture goals.

## Cloud design
Keep the cloud layer stateless where possible. Store durable state in PostgreSQL and coordination/cache state in Redis.

## Tool versioning
Example: filesystem.create_file.v1 and filesystem.create_file.v2.
Use new versions for breaking changes.

## Backward compatibility
Do not break existing MCP clients unnecessarily. Deprecated tools should indicate replacement and deprecation state.