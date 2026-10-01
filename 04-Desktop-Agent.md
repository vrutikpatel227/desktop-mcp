# 04 — Desktop Agent

## Role
A lightweight local agent that performs approved operations on the user's machine.

## Responsibilities
- Filesystem operations
- Terminal and PowerShell execution
- Process management
- Application launching
- Browser automation bridge
- System information
- Local network operations
- Agent health monitoring

## Security
Run with least privilege. Normal developer workflows should not require administrator rights.

## Identity
Each agent has a device identity and reports device ID, device name, OS, version, CPU, memory, last-seen time and connection status.

## Connectivity
Local mode should continue to work without cloud dependency when configured. Remote mode uses authenticated outbound connectivity.

## Startup and recovery
Support optional Windows startup/background service. Recover safely from disconnects and clean up managed processes after failures.