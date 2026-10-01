import fs from 'node:fs/promises';
import path from 'node:path';
import { validateManifest, type PluginManifest } from './manifest.js';

export async function discoverPlugins(root = path.resolve(process.cwd(), 'plugins')): Promise<PluginManifest[]> {
  const result: PluginManifest[] = [];
  let entries: Array<{ name: string; isDirectory(): boolean }>;
  try { entries = await fs.readdir(root, { withFileTypes: true }); } catch { return result; }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const raw = JSON.parse(await fs.readFile(path.join(root, entry.name, 'plugin.json'), 'utf8'));
      result.push(validateManifest(raw));
    } catch {}
  }
  return result;
}
