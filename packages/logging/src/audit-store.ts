import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';

export type CentralAuditEvent = {
  timestamp: string;
  actor: string;
  action: string;
  target?: string;
  status: 'success' | 'denied' | 'error';
  metadata?: Record<string, unknown>;
};

export interface AuditStore {
  append(event: CentralAuditEvent): Promise<void>;
  recent(limit?: number): Promise<CentralAuditEvent[]>;
  prune(retentionDays: number): Promise<number>;
}

class FileAuditStore implements AuditStore {
  constructor(private readonly filePath: string) {}

  async append(event: CentralAuditEvent) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.appendFile(this.filePath, JSON.stringify(event) + '\n', 'utf8');
  }

  async recent(limit = 100) {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      return raw.trim().split(/\r?\n/).filter(Boolean).slice(-limit).reverse().map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }

  async prune(retentionDays: number) {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const cutoff = Date.now() - retentionDays * 86_400_000;
      const lines = raw.split(/\r?\n/).filter(Boolean);
      const kept = lines.filter(line => {
        try { return new Date(JSON.parse(line).timestamp).getTime() >= cutoff; } catch { return true; }
      });
      await fs.writeFile(this.filePath, kept.length ? kept.join('\n') + '\n' : '', 'utf8');
      return lines.length - kept.length;
    } catch { return 0; }
  }
}

class PostgresAuditStore implements AuditStore {
  private readonly pool: Pool;
  private ready?: Promise<void>;

  constructor(url: string) {
    this.pool = new Pool({ connectionString: url, max: 10 });
  }

  private async ensure() {
    this.ready ??= this.pool.query(`CREATE TABLE IF NOT EXISTS desktop_mcp_audit (
      id BIGSERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      status TEXT NOT NULL,
      metadata JSONB
    )`).then(() => undefined);
    await this.ready;
  }

  async append(event: CentralAuditEvent) {
    await this.ensure();
    await this.pool.query(
      'INSERT INTO desktop_mcp_audit (timestamp,actor,action,target,status,metadata) VALUES ($1,$2,$3,$4,$5,$6)',
      [event.timestamp, event.actor, event.action, event.target ?? null, event.status, JSON.stringify(event.metadata ?? {})]
    );
  }

  async recent(limit = 100) {
    await this.ensure();
    const result = await this.pool.query(
      'SELECT timestamp,actor,action,target,status,metadata FROM desktop_mcp_audit ORDER BY timestamp DESC LIMIT $1',
      [Math.max(1, Math.min(limit, 500))]
    );
    return result.rows.map(row => ({
      timestamp: new Date(row.timestamp).toISOString(),
      actor: row.actor,
      action: row.action,
      target: row.target ?? undefined,
      status: row.status,
      metadata: row.metadata ?? {}
    }));
  }

  async prune(retentionDays: number) {
    await this.ensure();
    const result = await this.pool.query('DELETE FROM desktop_mcp_audit WHERE timestamp < NOW() - ($1::text || \' days\')::interval', [String(Math.max(1, retentionDays))]);
    return result.rowCount ?? 0;
  }
}

let store: Promise<AuditStore> | undefined;

export function getAuditStore() {
  return store ??= Promise.resolve(
    process.env.DESKTOP_MCP_DATABASE_URL
      ? new PostgresAuditStore(process.env.DESKTOP_MCP_DATABASE_URL)
      : new FileAuditStore(path.resolve(process.env.DESKTOP_MCP_DATA_DIR ?? './data', 'gateway-audit.jsonl'))
  );
}
