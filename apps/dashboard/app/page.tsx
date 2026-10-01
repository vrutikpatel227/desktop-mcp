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

export default function Dashboard() {
  const [health, setHealth] = useState<Health>({});
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      setHealth(await res.json());
    } catch {
      setHealth({ error: 'Unable to reach dashboard API.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const online = health.ok === true;

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
          <p>{health.service ?? health.error ?? 'Waiting for health response.'}</p>
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