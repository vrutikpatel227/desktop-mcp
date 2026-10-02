'use client';

import { useEffect, useState } from 'react';

type Health = {
  ok?: boolean;
  service?: string;
  port?: number;
  workspace?: string;
  hostname?: string;
  platform?: string;
  error?: string;
};
type Device = { id: string; name: string; online: boolean; revoked: boolean; lastSeen?: string };

export default function Dashboard() {
  const [health, setHealth] = useState<Health>({});
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [healthRes, devicesRes] = await Promise.all([
        fetch('/api/health', { cache: 'no-store' }),
        fetch('/api/devices', { cache: 'no-store' })
      ]);
      setHealth(await healthRes.json());
      if (devicesRes.ok) setDevices(await devicesRes.json());
    } catch {
      setHealth({ error: 'Unable to reach dashboard API.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const onlineDevices = devices.filter(d => d.online && !d.revoked);
  const online = onlineDevices.length > 0;

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">DESKTOP MCP</span>
          <h1>Developer Control Plane</h1>
          <p>Local-first MCP server and desktop agent status.</p>
        </div>
        <button onClick={() => void refresh()} disabled={loading}>{loading ? 'Checking…' : 'Refresh'}</button>
      </header>

      <section className="grid">
        <article className="card status">
          <div className="label">AGENT STATUS</div>
          <div className={online ? 'state online' : 'state offline'}>
            <span className="dot" /> {online ? 'Online' : 'Offline'}
          </div>
          <p>{onlineDevices.length ? onlineDevices.length + ' device' + (onlineDevices.length === 1 ? '' : 's') + ' connected' : (health.error ?? 'No desktop agent connected.')}</p>
        </article>

        <article className="card">
          <div className="label">CONNECTED DEVICES</div>
          <strong>{onlineDevices.length}</strong>
          <p>{onlineDevices.length ? onlineDevices.map(d => d.name).join(', ') : 'No devices online'}</p>
        </article>

        <article className="card">
          <div className="label">DEVICE</div>
          <strong>{health.hostname ?? '—'}</strong>
          <p>{health.platform ?? '—'}</p>
        </article>

        <article className="card">
          <div className="label">AGENT PORT</div>
          <strong>{health.port ?? '—'}</strong>
          <p>Loopback only</p>
        </article>

        <article className="card wide">
          <div className="label">WORKSPACE</div>
          <code>{health.workspace ?? '—'}</code>
          <p>Filesystem operations are intended to stay inside the configured workspace boundary.</p>
        </article>
      </section>

      <section className="card next">
        <div className="label">CONTROL PLANE</div>
        <div className="nav-grid">
          <a href="/devices" className="control-link">Devices & Pairing →</a>
          <a href="/tools" className="control-link">Tools →</a>
          <a href="/team" className="control-link">Team & RBAC →</a>
          <a href="/settings" className="control-link">Settings →</a>
        </div>
        <p>Manage paired agents, inspect the tool surface, team roles and execution policy.</p>
      </section>

      <section className="card next">
        <div className="label">IMPLEMENTATION</div>
        <div className="checks">
          <span>✓ MCP Server</span>
          <span>✓ Desktop Agent</span>
          <span>✓ Filesystem tools</span>
          <span>✓ PowerShell policy</span>
          <span>✓ Process tools</span>
          <span>✓ Git tools</span>
          <span>→ Pairing UI</span>
          <span>→ Remote Gateway</span>
        </div>
      </section>
    </main>
  );
}