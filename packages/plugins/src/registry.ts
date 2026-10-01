import fs from 'node:fs/promises';
import path from 'node:path';
import { validateManifest, type PluginManifest } from './manifest.js';

export async function listPlugins(root = path.resolve(process.env.DESKTOP_MCP_PLUGIN_DIR ?? './plugins')): Promise<PluginManifest[]> {
  const results: PluginManifest[] = [];
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(root, entry.name, 'plugin.json');
      try {
        const raw = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
        results.push(validateManifest(raw));
      } catch {}
    }
  } catch {}
  return results;
}
