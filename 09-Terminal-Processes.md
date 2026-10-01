# 09 — Terminal & Process Management

## Required terminal tools
execute_command, execute_powershell, start_process, stop_process, restart_process, get_process, get_process_logs.

## Process tracking
Track process ID, status, PID, CPU, memory, port and uptime.

## Background work
Long-running services must not block an MCP request. Return a process identifier and expose follow-up status/log operations.

## Example
User: Stop my Next.js server.
System: identify matching managed process -> apply policy -> stop process -> return status.

## Command examples
Developer commands can include npm run dev, builds, tests and Git operations, but every command still passes validation and policy checks.

## Safety
Use timeouts, controlled working directories, safe environment handling and cleanup on crashes. Never blindly retry destructive operations.