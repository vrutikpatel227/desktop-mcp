# 16 — Smart Confirmation & Human-in-the-Loop

## Principle
Do not request confirmation for every safe action, but never give unrestricted system authority without user control.

## Example policy
Create/read/list files: automatic.
Package installation: policy based.
Git push: configurable.
Delete project: confirmation.
System changes: confirmation.

## Modes
- Safe Mode — maximum confirmation
- Balanced Mode — normal development workflow
- Developer Mode — minimal interruption inside trusted workspaces

Dangerous and critical operations remain protected in every mode.

## User controls
Allow, Deny, Always Allow and Always Deny.

## Emergency stop
CLI: desktop-mcp emergency-stop
Stop new executions, terminate managed processes, disconnect AI sessions and disable the agent.