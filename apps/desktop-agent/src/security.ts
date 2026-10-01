import path from 'node:path';
import { WORKSPACE } from './config.js';

const BLOCKED_PREFIXES = [
  'C:\\Windows',
  'C:\\Program Files',
  'C:\\Program Files (x86)'
];

export function assertWorkspace(target: string): string {
  const root = path.resolve(WORKSPACE);
  const resolved = path.resolve(target);
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('PATH_NOT_ALLOWED');
  }
  return resolved;
}

export function assertNotProtected(target: string): void {
  const normalized = path.resolve(target).toLowerCase();
  for (const prefix of BLOCKED_PREFIXES) {
    if (normalized.startsWith(prefix.toLowerCase())) {
      throw new Error('PATH_NOT_ALLOWED');
    }
  }
}
