'use client';

import { useEffect, useState } from 'react';

type Device = { id: string; name: string; platform: string; createdAt: string; lastSeen?: string; revoked: boolean; online: boolean };
type Audit = { timestamp?: string; actor?: string; action?: string; target?: string; status?: string };

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [pair, setPair] = useState<{ code: string; expiresAt: string } | null>(null);
  const [pairLoading, setPairLoading] = useState(false);
  const [pairError, setPairError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const apiUrl = (path: string) => window.location.origin + path;

  async function refresh() {
    try {
      const [deviceRes, auditRes] = await Promise.all([
        fetch(apiUrl('/api/devices'), { cache: 'no-store' }),
        fetch(apiUrl('/api/audit'), { cache: 'no-store' })
      ]);
      setDevices(deviceRes.ok ? await deviceRes.json() : []);
      setAudit(auditRes.ok ? await auditRes.json() : []);
    } finally { setLoading(false); }
  }

  async function createPairCode() {
    setPairLoading(true); setPairError(''); setCopyMessage('');
    try {
      const res = await fetch(apiUrl('/api/pair/start'), {
        method: 'GET', cache: 'no-store', credentials: 'same-origin',
        headers: { accept: 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.code !== 'string') throw new Error(data.detail ? `${data.error ?? 'PAIRING_FAILED'}: ${data.detail}` : (data.error ?? 'PAIRING_FAILED'));
      setPair({ code: data.code, expiresAt: data.expiresAt });
      await refresh();
    } catch (error) {
      setPairError(error instanceof Error ? error.message : 'Unable to generate pairing code.');
    } finally { setPairLoading(false); }
  }

  function getCommand(code: string) {
    return 'powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\\Desktop\\Desktop MCP Server\\scripts\\setup-agent.ps1" -GatewayUrl "http://127.0.0.1:8790" -PairCode "' + code + '"';
  }

  async function copyCommand() {
    if (!pair) return;
    await navigator.clipboard.writeText(getCommand(pair.code));
    setCopyMessage('CMD copied! Paste it into PowerShell and press Enter.');
  }

  async function revoke(id: string) {
    await fetch(apiUrl('/api/devices/' + encodeURIComponent(id) + '/revoke'), { method: 'POST' });
    await refresh();
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(timer);
  }, []);

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
        <p>Generate a one-time code, then copy the PowerShell command and run it on this Windows PC.</p>
        <div className="pairrow">
          <button onClick={() => void createPairCode()} disabled={pairLoading}>
            {pairLoading ? 'Generating…' : 'Generate Pairing Code'}
          </button>
          {pair && <code className="paircode">{pair.code}</code>}
        </div>
        {pair && <p>Expires {new Date(pair.expiresAt).toLocaleTimeString()}.</p>}
        {pair && (
          <div style={{ marginTop: 16 }}>
            <div className="label">POWERSHELL COMMAND</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', marginTop: 8 }}>
              <code style={{ flex: 1, display: 'block', padding: 14, border: '1px solid #30343b', borderRadius: 10, overflowX: 'auto', whiteSpace: 'pre', fontSize: 13 }}>
                {getCommand(pair.code)}
              </code>
              <button onClick={() => void copyCommand()}>Copy CMD</button>
            </div>
            <p>Click Copy CMD → open PowerShell → paste → press Enter.</p>
          </div>
        )}
        {copyMessage && <p role="status">{copyMessage}</p>}
        {pairError && <p role="alert">Unable to generate code: {pairError}</p>}
      </section>

      <section className="card next">
        <div className="label">CONNECTED DEVICES</div>
        <div className="device-list">
          {devices.length === 0 && <p>No paired devices yet.</p>}
          {devices.map(device => (
            <div className="device" key={device.id}>
              <div><strong>{device.name}</strong><p>{device.id} · {device.platform}</p></div>
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
              <div><strong>{event.action ?? 'event'}</strong><p>{event.timestamp ? new Date(event.timestamp).toLocaleString() : '—'}{event.actor ? ' · ' + event.actor : ''}{event.target ? ' · ' + event.target : ''}</p></div>
              <span className={event.status === 'success' ? 'online' : event.status === 'blocked' ? 'offline' : ''}>{event.status ?? 'unknown'}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
