# 28 — Master Requirements Reference

## Source coverage
This pack is based on the complete Universal Desktop MCP Server PRD and reorganizes its 82 sections into implementation modules.

## Coverage map
01-04: product overview, vision, principles, clients, components.
05-08: MCP server, agent, execution engine, policy and auth.
09-12: workflows, filesystem, terminal, command security, process management.
13-16: browser, apps, Git, GitHub, email, secrets.
17-20: configuration, local/remote modes, pairing, tool discovery.
21-24: resources, prompts, confirmation, request lifecycle.
25-28: structured errors, timeouts, background jobs, rate limits.
29-32: audit logs, dashboard, CLI, installation.
33-38: startup, health, offline mode, multi-device, team architecture, security.
39-45: SSRF, output security, production architecture, technology stack.
46-53: project structure, APIs, schemas, permissions, workspace profiles.
54-60: project context, detection, testing, security testing, reliability, observability and DX.
61-70: client configuration, example commands, AI behavior, no-hidden-execution, HITL, kill switch, updates, privacy and retention.
71-82: deployment, scalability, versioning, compatibility, acceptance, MVP, phases, definition of done, product definition, branding, deliverables and success metric.

## Canonical principles
Secure-by-default, provider-neutral MCP architecture, least privilege, workspace sandboxing, human control, complete auditing, safe retries and modular extensibility.