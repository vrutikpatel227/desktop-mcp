'use client';

import { useEffect, useState } from 'react';

type Device = {
  id: string;
  name: string;
  platform: string;
  createdAt: string;
  lastSeen?: string;
  revoked: boolean;
  online: boolean;
};

type Audit = {
  timestamp?: string;
  actor?: string;
  action?: string;
  target?: string;
  status?: string;
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [pair, setPair] = useState<{ code: string; expiresAt: string } | null>(null);
  const [pairLoading, setPairLoading] = useState(false);
  const [pairError, setPairError] = useState('');
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [deviceRes, auditRes] = await Promise.all([
        fetch('/api/devices', { cache: 'no-store' }),
        fetch('/api/audit', { cache: 'no-store' })
      ]);
      setDevices(deviceRes.ok ? await deviceRes.json() : []);
      setAudit(auditRes.ok ? await auditRes.json() : []);
    } finally { setLoading(false); }
  }

  async function createPairCode() {
    setPairLoading(true);
    setPairError('');
    try {
      const res = await fetch('/api/pair/start', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { accept: 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.code !== 'string') {
        throw new Error(data.error ?? 'PAIRING_FAILED');
      }
      setPair({ code: data.code, expiresAt: data.expiresAt });
      await refresh();
    } catch (error) {
      setPairError(error instanceof Error ? error.message : 'Unable to generate pairing code.');
    } finally {
      setPairLoading(false);
    }
  }

  async function revoke(id: string) {
    await fetch('/api/devices/' + encodeURIComponent(id), { method: 'DELETE' });
    await refresh();
  }

  async function rotate(id: string) {
    const res = await fetch('/api/devices/' + encodeURIComponent(id) + '/rotate', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      alert('New device token generated. Store it securely on the agent before restarting it.');
      void navigator.clipboard?.writeText(data.token);
    }
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <a href="/" className="eyebrow">← DESKTOP MCP</a>
          <h1>Devices</h1>
          <p>Pair, inspect and revoke connected Desktop Agents.</p>
        </div>
        <button onClick={() => void refresh()} disabled={loading}>Refresh</button>
      </header>

      <section className="card">
        <div className="label">PAIR DEVICE</div>
        <p>Generate a one-time code, then use the agent setup wizard on the target Windows PC. No .env editing is required.</p>
        <div className="pairrow">
          <button onClick={() => void createPairCode()} disabled={pairLoading}>
            {pairLoading ? 'Generating…' : 'Generate Pairing Code'}
          </button>
          {pair && <code className="paircode">{pair.code}</code>}
        </div>
        {pair && <p>Expires {new Date(pair.expiresAt).toLocaleTimeString()}.</p>}
        {pairError && <p role="alert">Unable to generate code: {pairError}</p>}
      </section>

      <section className="card next">
        <div className="label">CONNECTED DEVICES</div>
        <div className="device-list">
          {devices.length === 0 && <p>No paired devices yet.</p>}
          {devices.map(device => (
            <div className="device" key={device.id}>
              <div>
                <strong>{device.name}</strong>
                <p>{device.id} · {device.platform}</p>
              </div>
              <div className="device-actions">
                <span className={device.online ? 'online' : 'offline'}>{device.online ? 'ONLINE' : 'OFFLINE'}</span>
                <button onClick={() => void revoke(device.id)}>Revoke</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="card next">
        <div className="label">RECENT AUDIT</div>
        <div className="audit-list">
          {audit.length === 0 && <p>No audit events recorded yet.</p>}
          {audit.map((event, index) => (
            <div className="audit" key={index}>
              <div>
                <strong>{event.action ?? 'event'}</strong>
                <p>{event.timestamp ? new Date(event.timestamp).toLocaleString() : '—'}{event.actor ? ' · ' + event.actor : ''}{event.target ? ' · ' + event.target : ''}</p>
              </div>
              <span className={event.status === 'success' ? 'online' : event.status === 'blocked' ? 'offline' : ''}>
                {event.status ?? 'unknown'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
