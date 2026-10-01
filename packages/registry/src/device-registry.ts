import fs from 'node:fs/promises';
import path from 'node:path';

export type RegistryDevice = {
  id: string;
  name: string;
  platform: string;
  agentUrl: string;
  createdAt: string;
  lastSeen: string;
  status: 'online' | 'offline' | 'revoked';
};

export class DeviceRegistry {
  private devices = new Map<string, RegistryDevice>();
  private loaded = false;

  constructor(private readonly filePath: string) {}

  async load() {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      for (const item of JSON.parse(raw) as RegistryDevice[]) this.devices.set(item.id, item);
    } catch {}
    this.loaded = true;
  }

  async save() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify([...this.devices.values()], null, 2), 'utf8');
  }

  async upsert(device: RegistryDevice) {
    await this.load();
    this.devices.set(device.id, device);
    await this.save();
  }

  async list() {
    await this.load();
    return [...this.devices.values()];
  }

  async revoke(id: string) {
    await this.load();
    const device = this.devices.get(id);
    if (!device) return false;
    device.status = 'revoked';
    await this.save();
    return true;
  }
}
