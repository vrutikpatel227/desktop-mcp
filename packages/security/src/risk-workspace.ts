import fs from 'node:fs';
import path from 'node:path';

function configuredWorkspace() {
  return path.resolve(process.env.DESKTOP_MCP_WORKSPACE ?? 'C:\\AI-Workspace');
}

function nearestExisting(target: string) {
  let current = path.resolve(target);
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return current;
    current = parent;
  }
  return current;
}

export function assertWorkspace(target: string) {
  const root = fs.realpathSync.native(nearestExisting(configuredWorkspace()));
  const resolved = path.resolve(target);
  const existing = nearestExisting(resolved);
  const realExisting = fs.realpathSync.native(existing);
  const relative = path.relative(root, realExisting);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('PATH_NOT_ALLOWED');
  return resolved;
}
