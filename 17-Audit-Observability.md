# 17 — Audit, Logs & Observability

## Audit record
Store timestamp, client, user, tool, arguments, target, permission result, execution result, duration and error information.

## Dashboard fields
Time, client, tool, action, target, status and duration.

## No hidden execution
Record what was requested, which tool was called, which arguments were used, what command executed and what result came back.

## Log categories
Application logs, security logs, audit logs, agent logs, tool execution logs, error logs and performance metrics.

## Metrics
requests_total
tool_execution_total
tool_execution_failed
execution_duration
agent_connected
agent_disconnected
active_processes

## Output safety
Limit stdout size, redact secrets and use log IDs/file references/pagination for large outputs.