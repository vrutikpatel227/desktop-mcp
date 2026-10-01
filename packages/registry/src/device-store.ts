import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';

export type DeviceRecord = {
  id: string;
  name: string;
  platform: string;
  createdAt: string;
  revoked: boolean;
  tokenVersion: number;
  lastSeen?: string;
};

export interface DeviceStore {
  list(): Promise<DeviceRecord[]>;
  find(id: string): Promise<DeviceRecord | undefined>;
  add(device: DeviceRecord): Promise<void>;
  update(id: string, patch: Partial<DeviceRecord>): Promise<boolean>;
}

class FileDeviceStore implements DeviceStore {
  constructor(private readonly filePath: string) {}
  private async read() {
    try {
      const items = JSON.parse(await fs.readFile(this.filePath, 'utf8')) as Array<Partial<DeviceRecord>>;
      return items.map((item): DeviceRecord => {
        const result: DeviceRecord = {
          id: String(item.id), name: String(item.name), platform: String(item.platform),
          createdAt: String(item.createdAt), revoked: item.revoked === true,
          tokenVersion: Number(item.tokenVersion ?? 0)
        };
        if (item.lastSeen) result.lastSeen = String(item.lastSeen);
        return result;
      });
    } catch { return []; }
  }
  private async write(items: DeviceRecord[]) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(items, null, 2), 'utf8');
  }
  async list() { return this.read(); }
  async find(id: string) { return (await this.read()).find(item => item.id === id); }
  async add(device: DeviceRecord) {
    const items = await this.read();
    items.push(device);
    await this.write(items);
  }
  async update(id: string, patch: Partial<DeviceRecord>) {
    const items = await this.read();
    const index = items.findIndex(item => item.id === id);
    if (index < 0) return false;
    items[index] = { ...items[index], ...patch };
    await this.write(items);
    return true;
  }
}

class PostgresDeviceStore implements DeviceStore {
  private readonly pool: Pool;
  private ready?: Promise<void>;
  constructor(url: string) { this.pool = new Pool({ connectionString: url, max: 10 }); }
  private ensure() {
    return this.ready ??= this.pool.query(`CREATE TABLE IF NOT EXISTS desktop_mcp_devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      platform TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      revoked BOOLEAN NOT NULL DEFAULT FALSE,
      token_version INTEGER NOT NULL DEFAULT 1,
      last_seen TIMESTAMPTZ
    )`).then(() => undefined);
  }
  async list() {
    await this.ensure();
    const result = await this.pool.query('SELECT id,name,platform,created_at,revoked,token_version,last_seen FROM desktop_mcp_devices ORDER BY created_at DESC');
    return result.rows.map(row => ({
      id: row.id, name: row.name, platform: row.platform,
      createdAt: new Date(row.created_at).toISOString(),
      revoked: Boolean(row.revoked),
      tokenVersion: Number(row.token_version),
      lastSeen: row.last_seen ? new Date(row.last_seen).toISOString() : undefined
    }));
  }
  async find(id: string) {
    await this.ensure();
    const result = await this.pool.query('SELECT id,name,platform,created_at,revoked,token_version,last_seen FROM desktop_mcp_devices WHERE id=$1', [id]);
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: row.id, name: row.name, platform: row.platform,
      createdAt: new Date(row.created_at).toISOString(),
      revoked: Boolean(row.revoked),
      tokenVersion: Number(row.token_version),
      lastSeen: row.last_seen ? new Date(row.last_seen).toISOString() : undefined
    };
  }
  async add(device: DeviceRecord) {
    await this.ensure();
    await this.pool.query(
      'INSERT INTO desktop_mcp_devices (id,name,platform,created_at,revoked,token_version,last_seen) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [device.id, device.name, device.platform, device.createdAt, device.revoked, device.tokenVersion, device.lastSeen ?? null]
    );
  }
  async update(id: string, patch: Partial<DeviceRecord>) {
    await this.ensure();
    const existing = await this.find(id);
    if (!existing) return false;
    const next = { ...existing, ...patch };
    await this.pool.query(
      'UPDATE desktop_mcp_devices SET name=$2,platform=$3,revoked=$4,token_version=$5,last_seen=$6 WHERE id=$1',
      [id, next.name, next.platform, next.revoked, next.tokenVersion, next.lastSeen ?? null]
    );
    return true;
  }
}

let storePromise: Promise<DeviceStore> | undefined;

export function getDeviceStore() {
  return storePromise ??= Promise.resolve(
    process.env.DESKTOP_MCP_DATABASE_URL
      ? new PostgresDeviceStore(process.env.DESKTOP_MCP_DATABASE_URL)
      : new FileDeviceStore(path.resolve(process.env.DESKTOP_MCP_DATA_DIR ?? './data', 'devices.json'))
  );
}
