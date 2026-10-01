'use client';

import { useMemo, useState } from 'react';

const groups: Record<string, string[]> = {
  System: ['system.get_info', 'agent.health'],
  Filesystem: ['filesystem.list_directory', 'filesystem.read_file', 'filesystem.create_directory', 'filesystem.write_file', 'filesystem.delete_file', 'filesystem.delete_directory', 'filesystem.move_file', 'filesystem.copy_file', 'filesystem.search_files', 'filesystem.search_in_files'],
  Terminal: ['terminal.execute_powershell'],
  Processes: ['process.start', 'process.list', 'process.get', 'process.stop'],
  Git: ['git.status', 'git.diff', 'git.log', 'git.add', 'git.commit', 'git.pull', 'git.push'],
  Browser: ['browser.open_url', 'browser.get_page_text', 'browser.navigate', 'browser.select', 'browser.click', 'browser.type', 'browser.screenshot', 'browser.close'],
  GitHub: ['github.status', 'github.repositories', 'github.create_repository', 'github.pull_request', 'github.issue'],
  Email: ['email.gmail_recent', 'email.gmail_get', 'email.gmail_send', 'email.outlook_recent', 'email.outlook_get'],
  Projects: ['project.detect', 'project.create', 'project.run'],
  Applications: ['app.launch', 'app.close', 'app.focus'],
  Secrets: ['secrets.set', 'secrets.get', 'secrets.delete'],
  Devices: ['device.execute', 'device.list']
};

export default function ToolsPage() {
  const [query, setQuery] = useState('');
  const list = useMemo(() => Object.entries(groups).map(([name, tools]) => ({
    name,
    tools: tools.filter(t => t.toLowerCase().includes(query.toLowerCase()))
  })).filter(group => group.tools.length), [query]);
  const count = Object.values(groups).flat().length;

  return <main className="shell">
    <header className="topbar">
      <div>
        <a href="/" className="eyebrow">← DESKTOP MCP</a>
        <h1>Tools</h1>
        <p>{count} registered protocol capabilities across the core and integrations.</p>
      </div>
      <input className="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter tools…" />
    </header>

    <section className="tool-groups">
      {list.map(group => <article className="card" key={group.name}>
        <div className="label">{group.name.toUpperCase()}</div>
        <div className="tool-list">
          {group.tools.map(tool => <code className="tool" key={tool}>{tool}</code>)}
        </div>
      </article>)}
    </section>
  </main>;
}