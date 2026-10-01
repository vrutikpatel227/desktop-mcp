# 19 — Local, Remote & Multi-Device

## Local mode
AI Client -> Local MCP Server -> Desktop Agent -> Computer.
Recommended for development and local workflows.

## Remote mode
AI Client -> Remote MCP Gateway -> authenticated persistent connection -> Desktop Agent -> computer.
Use secure outbound connectivity; avoid arbitrary inbound router ports.

## Device pairing
Install agent -> create identity -> pair with QR/code -> issue credentials -> connect.

## Multi-device
One user can have multiple devices such as laptop, desktop and development server.
The request can target a specific device.

## Team future
Organization -> users -> devices, with roles Owner, Admin, Developer and Viewer.

## Enterprise future
Central policies, fleet management and organization-level controls are Phase 3 capabilities.