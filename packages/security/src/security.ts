import path from 'node:path';
import { assertWorkspace as workspaceCheck } from './risk-workspace.js';

const BLOCKED_PREFIXES = ['C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)'];

export function assertWorkspace(target: string) { return workspaceCheck(target); }

export function assertNotProtected(target: string) {
  const normalized = path.resolve(target).toLowerCase();
  for (const prefix of BLOCKED_PREFIXES) if (normalized.startsWith(prefix.toLowerCase())) throw new Error('PATH_NOT_ALLOWED');
}
