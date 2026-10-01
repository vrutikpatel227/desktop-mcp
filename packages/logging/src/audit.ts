import fs from 'node:fs/promises';
import path from 'node:path';

export type AuditEvent = {
  timestamp: string;
  operation: string;
  target?: string;
  status: 'success' | 'error' | 'blocked';
  durationMs?: number;
  error?: string;
};

export async function appendAudit(root: string, event: AuditEvent) {
  const dir = path.join(root, '.desktop-mcp');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, 'audit.jsonl');
  await fs.appendFile(file, JSON.stringify(event) + '\n', 'utf8');
}
