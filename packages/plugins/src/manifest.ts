export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  description: string;
  entry: string;
  tools: string[];
  permissions: string[];
  trusted: boolean;
};

export function validateManifest(input: unknown): PluginManifest {
  const value = input as Partial<PluginManifest>;
  if (!value || typeof value.id !== 'string' || !/^[a-z0-9.-]+$/.test(value.id)) throw new Error('PLUGIN_ID_INVALID');
  if (typeof value.name !== 'string' || typeof value.version !== 'string' || typeof value.entry !== 'string') throw new Error('PLUGIN_MANIFEST_INVALID');
  return {
    id: value.id,
    name: value.name,
    version: value.version,
    description: value.description ?? '',
    entry: value.entry,
    tools: Array.isArray(value.tools) ? value.tools.map(String) : [],
    permissions: Array.isArray(value.permissions) ? value.permissions.map(String) : [],
    trusted: value.trusted === true
  };
}

export const pluginPolicy = {
  defaultTrusted: false,
  rule: 'Plugins are manifest-discovered and disabled until explicitly trusted by policy.'
};
