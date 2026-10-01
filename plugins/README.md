# Plugins

Plugins are manifest-discovered only. They are disabled until explicitly trusted by policy.

Each plugin directory may contain a plugin.json manifest with:
- id
- name
- version
- description
- entry
- tools
- permissions
- trusted

The core server never executes an untrusted plugin automatically.
