# 22 — Privacy & Data Retention

## Privacy principle
Local files remain local by default.

## Cloud behavior
The MCP server should not upload unnecessary file contents to the cloud. Only requested tool results are returned to the AI client.

## Modes
- Local Only
- Cloud Assisted
- Enterprise

## Audit retention
Default audit-log retention: 30 days.
Configurable values: 7, 30, 90 or 365 days.

## Sensitive output
Retention for sensitive command output should be separately configurable.
Secrets must be redacted before logs or MCP responses.

## User control
Privacy, retention and cloud-assistance behavior should be explicit configuration choices.