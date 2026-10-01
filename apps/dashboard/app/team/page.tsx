'use client';

import { useEffect, useState } from 'react';

type Member = { id: string; email: string; name: string; role: 'Owner'|'Admin'|'Developer'|'Viewer'; createdAt: string };

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Member['role']>('Developer');
  const [message, setMessage] = useState('');

  async function load() {
    const r = await fetch('/api/team/members', { cache: 'no-store' });
    setMembers(r.ok ? await r.json() : []);
  }

  async function add() {
    setMessage('');
    const r = await fetch('/api/team/members', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, name, role })
    });
    const data = await r.json();
    if (!r.ok) return setMessage(data.error ?? 'Unable to add member');
    setEmail(''); setName(''); setRole('Developer'); setMessage('Member added');
    await load();
  }

  async function changeRole(id: string, nextRole: Member['role']) {
    await fetch('/api/team/members/' + encodeURIComponent(id), {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: nextRole })
    });
    await load();
  }

  async function remove(id: string) {
    await fetch('/api/team/members/' + encodeURIComponent(id), { method: 'DELETE' });
    await load();
  }

  useEffect(() => { void load(); }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <div><a href="/" className="eyebrow">← DESKTOP MCP</a><h1>Team</h1><p>Manage organization members and roles.</p></div>
        <button onClick={() => void load()}>Refresh</button>
      </header>
      <section className="card">
        <div className="label">ADD MEMBER</div>
        <div className="form-grid">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" />
          <select value={role} onChange={e => setRole(e.target.value as Member['role'])}>
            <option>Developer</option><option>Admin</option><option>Viewer</option><option>Owner</option>
          </select>
          <button onClick={() => void add()}>Add Member</button>
        </div>
        {message && <p>{message}</p>}
      </section>
      <section className="card next">
        <div className="label">MEMBERS</div>
        <div className="device-list">
          {members.length === 0 && <p>No team members yet.</p>}
          {members.map(member => (
            <div className="device" key={member.id}>
              <div><strong>{member.name}</strong><p>{member.email} · {member.id}</p></div>
              <div className="device-actions">
                <select value={member.role} onChange={e => void changeRole(member.id, e.target.value as Member['role'])}>
                  <option>Owner</option><option>Admin</option><option>Developer</option><option>Viewer</option>
                </select>
                <button onClick={() => void remove(member.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}