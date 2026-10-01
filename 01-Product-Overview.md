# 01 — Product Overview & Vision

## Product definition
Universal Desktop MCP Server is a secure local AI execution platform connecting MCP-compatible AI clients to controlled computer resources.

## Purpose
AI understands the request and selects a tool. The MCP layer validates, authorizes and routes it. The local agent performs the approved operation.

## Core flow
1. Natural-language request
2. AI reasoning
3. MCP tool call
4. Authentication
5. Authorization and policy validation
6. Local execution
7. Result returned to AI client

## Supported clients
ChatGPT, Claude, Gemini, Cursor, VS Code, custom agents, open-source MCP clients, enterprise and internal AI tools.

## Core principle
AI decides WHAT needs to be done. MCP Server decides WHETHER and HOW the operation can safely be executed.

## Provider independence
Do not put provider-specific logic inside the core execution engine. Any MCP-compatible client should be able to use the same infrastructure.