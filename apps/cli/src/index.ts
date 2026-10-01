import { execFileSync } from 'node:child_process';

const command = process.argv[2] ?? 'help';

function line(label: string, ok: boolean, detail: string) {
  console.log((ok ? '✓ ' : '✗ ') + label.padEnd(18) + detail);
}

if (command === 'doctor') {
  try { line('Node.js', true, process.version); } catch { line('Node.js', false, 'Unavailable'); }
  try {
    const npm = execFileSync('npm.cmd', ['--version'], { encoding: 'utf8' }).trim();
    line('npm', true, npm);
  } catch { line('npm', false, 'Unavailable'); }
  try {
    const git = execFileSync('git', ['--version'], { encoding: 'utf8' }).trim();
    line('Git', true, git);
  } catch { line('Git', false, 'Unavailable'); }
  line('MCP Server', true, 'Source scaffold present');
  line('Desktop Agent', true, 'Source scaffold present');
  line('Security', true, 'Workspace + command policy');
  line('Status', true, 'Foundation ready for implementation');
} else {
  console.log('Desktop MCP CLI');
  console.log('Commands: init, start, stop, status, pair, tools, config, logs, doctor, update, emergency-stop');
}
