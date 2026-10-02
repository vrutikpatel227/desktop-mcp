#!/usr/bin/env node
const { spawn } = require('node:child_process');
const path = require('node:path');

const command = process.argv[2] || 'help';
const root = path.resolve(__dirname, '..');

if (command === 'remote') {
  const script = path.join(root, 'scripts', 'remote-connect.ps1');
  const child = spawn('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', script,
    ...process.argv.slice(3)
  ], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: false
  });
  child.on('exit', code => process.exit(code ?? 1));
  child.on('error', error => {
    console.error('Desktop MCP Remote failed:', error.message);
    process.exit(1);
  });
} else {
  console.log('Desktop MCP CLI');
  console.log('');
  console.log('Usage:');
  console.log('  desktop-mcp remote');
  console.log('');
  console.log('Start the interactive Desktop MCP Remote connector.');
}
