# 05 — Execution Engine & Tool Model

## Execution types
- File operation
- Terminal command
- PowerShell command
- Process operation
- Browser operation
- Application operation
- Git operation
- Package manager operation
- System operation

## Tool metadata
Every tool defines name, description, inputSchema, riskLevel, requiredPermission and timeout.

## Timeouts
File operation: about 30 seconds.
Normal command: about 120 seconds.
Build: up to about 10 minutes.
Test suite: up to about 15 minutes.
Long-running servers use background processes.

## Background execution
start_process -> process_id -> monitor process -> get logs -> stop/restart when requested.

## Output
Capture stdout/stderr, enforce size limits, redact secrets and return large results through pagination or references.