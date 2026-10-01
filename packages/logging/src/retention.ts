import fs from 'node:fs/promises';

export async function pruneAuditFile(file: string, retentionDays: number) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const cutoff = Date.now() - retentionDays * 86_400_000;
    const kept = raw.split(/\r?\n/).filter(line => {
      if (!line.trim()) return false;
      try {
        const item = JSON.parse(line) as { timestamp?: string };
        return !item.timestamp || new Date(item.timestamp).getTime() >= cutoff;
      } catch { return true; }
    });
    await fs.writeFile(file, kept.join('\n') + (kept.length ? '\n' : ''), 'utf8');
    return kept.length;
  } catch { return 0; }
}
