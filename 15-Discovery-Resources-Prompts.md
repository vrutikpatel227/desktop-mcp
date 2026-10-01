# 15 — MCP Discovery, Resources & Prompts

## Tool discovery
After connection, the client uses tools/list and receives available MCP tools.

## Typical namespaces
filesystem.*, terminal.*, browser.*, git.*, system.*.

## Resources
Use MCP resources for contextual information such as:
workspace://projects
workspace://project/{id}
process://running
system://info
logs://agent

## Prompts
Optional reusable workflows can include:
create_web_project
debug_project
run_tests
review_code
deploy_project
diagnose_server

## Example prompt
"Create a production-ready Next.js application inside the selected workspace."

## Goal
Expose repeatable workflows while keeping execution governed by the same security and policy layer.