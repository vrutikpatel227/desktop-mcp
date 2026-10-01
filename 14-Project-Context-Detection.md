# 14 — Project Context & Detection

## Project metadata
The server may maintain name, path, framework, package manager, development command and port.

## Example
name: Codee Erra
path: D:/Projects/CodeeErra
framework: Next.js
packageManager: npm
devCommand: npm run dev
port: 3000

## Automatic project detection
When the user says "run my project", inspect package.json and related files to detect framework, package manager, scripts and port.

## Supported frameworks
Next.js, React, Vite, Node.js, Express, Python, FastAPI, Django, Java and .NET.

## Future
Add more framework detectors without changing the MCP core.

## Context benefit
Project metadata gives the AI enough context to operate the correct project with fewer manual steps.