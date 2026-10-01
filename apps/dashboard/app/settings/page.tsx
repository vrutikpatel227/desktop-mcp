'use client';

import { useEffect, useState } from 'react';

type Settings = {
  workspace: string;
  confirmationMode: 'safe' | 'balanced' | 'developer';
  allowLocalBrowser: boolean;
  allowExternalWrites: boolean;
};

type Policy = {
  disabledTools: string[];
  blockedCommands: string[];
  maxRequestsPerMinute: number;
  confirmationMode: 'safe' | 'balanced' | 'developer';
};

const defaults: Settings = {
  workspace: 'C:\\AI-Workspace',
  confirmationMode: 'balanced',
  allowLocalBrowser: false,
  allowExternalWrites: false
};

const policyDefaults: Policy = {
  disabledTools: [],
  blockedCommands: [],
  maxRequestsPerMinute: 100,
  confirmationMode: 'balanced'
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [policy, setPolicy] = useState<Policy>(policyDefaults);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/config', { cache: 'no-store' }).then(r => r.ok ? r.json() : defaults),
      fetch('/api/policy', { cache: 'no-store' }).then(r => r.ok ? r.json() : policyDefaults)
    ]).then(([config, nextPolicy]) => {
      setSettings(config);
      setPolicy(nextPolicy);
    }).catch(() => {});
  }, []);

  async function save() {
    setSaved(false);
    const [configRes, policyRes] = await Promise.all([
      fetch('/api/config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(settings) }),
      fetch('/api/policy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(policy) })
    ]);
    if (configRes.ok && policyRes.ok) setSaved(true);
  }

  return <main className="shell">
    <header className="topbar">
      <div>
        <a href="/" className="eyebrow">← DESKTOP MCP</a>
        <h1>Settings</h1>
        <p>Local control-plane preferences. Policy changes are applied by the local Agent on the next request.</p>
      </div>
    </header>

    <section className="card form">
      <label>Workspace root
        <input value={settings.workspace} onChange={e => setSettings(s => ({ ...s, workspace: e.target.value }))} />
      </label>
      <label>Confirmation mode
        <select value={settings.confirmationMode} onChange={e => setSettings(s => ({ ...s, confirmationMode: e.target.value as Settings['confirmationMode'] }))}>
          <option value="safe">Safe Mode</option><option value="balanced">Balanced Mode</option><option value="developer">Developer Mode</option>
        </select>
      </label>
      <label className="toggle"><input type="checkbox" checked={settings.allowLocalBrowser} onChange={e => setSettings(s => ({ ...s, allowLocalBrowser: e.target.checked }))} /> Allow browser access to localhost/private targets</label>
      <label className="toggle"><input type="checkbox" checked={settings.allowExternalWrites} onChange={e => setSettings(s => ({ ...s, allowExternalWrites: e.target.checked }))} /> Allow external writes (GitHub/email)</label>

      <div className="divider" />
      <div className="label">POLICY ENGINE</div>
      <label>Max requests / minute
        <input type="number" min="1" max="10000" value={policy.maxRequestsPerMinute} onChange={e => setPolicy(p => ({ ...p, maxRequestsPerMinute: Number(e.target.value) }))} />
      </label>
      <label>Disabled tools
        <textarea value={policy.disabledTools.join('\n')} onChange={e => setPolicy(p => ({ ...p, disabledTools: e.target.value.split(/\r?\n/).map(v => v.trim()).filter(Boolean) }))} rows={6} placeholder="filesystem.delete_file&#10;terminal.execute_powershell" />
      </label>
      <label>Custom blocked command fragments
        <textarea value={policy.blockedCommands.join('\n')} onChange={e => setPolicy(p => ({ ...p, blockedCommands: e.target.value.split(/\r?\n/).map(v => v.trim()).filter(Boolean) }))} rows={5} placeholder="shutdown&#10;format-volume" />
      </label>

      <div>
        <button onClick={() => void save()}>Save Settings</button>
        {saved && <span className="saved">Saved</span>}
      </div>
    </section>

    <section className="card next">
      <div className="label">PRODUCTION NOTE</div>
      <p>Public deployments must authenticate the dashboard separately. Keep localhost/private browser access and external writes disabled unless the use case explicitly requires them.</p>
    </section>
  </main>;
}
