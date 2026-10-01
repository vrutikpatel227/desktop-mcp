# 06 — Security & Policy Engine

## Default posture
Workspace-only access. Users may explicitly allow additional directories.

## Path security
Block path traversal and prevent resolved paths from escaping approved boundaries.

## Restricted examples
Windows system directories, Program Files, registry, credential stores and security configuration.

## Risk levels
LOW: read-only and informational developer operations.
MEDIUM: package installation, builds, pulls and similar changes.
HIGH: destructive file actions, hard Git resets, migrations and system changes.
CRITICAL: disk operations, credential extraction, security disabling and destructive system operations.

## Defaults
LOW may auto-execute. MEDIUM follows policy or confirmation. HIGH requires explicit confirmation by default. CRITICAL is blocked by default.

## Required controls
Input validation, allow/deny controls, least privilege, process isolation where possible, timeouts, rate limiting, SSRF protection, secret protection and complete auditability.