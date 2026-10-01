# 03 — MCP Server Requirements

## Responsibilities
- MCP protocol handling and handshake
- Tool discovery and execution
- Authentication and authorization
- Request and schema validation
- Policy enforcement and risk assessment
- Execution routing
- Audit logging
- Structured error handling

## Tool discovery
Clients use tools/list to discover available capabilities. Tools should be organized into logical namespaces such as filesystem, terminal, browser, git and system.

## Request lifecycle
Receive request -> validate protocol -> authenticate client -> validate session -> validate tool/schema/arguments -> resolve target -> workspace check -> policy check -> calculate risk -> request confirmation when required -> execute -> capture output -> validate result -> audit -> return MCP response.

## Provider rule
Keep the MCP server provider-neutral and standards-compliant.

## Errors
Return structured machine-readable errors rather than unstructured command output.