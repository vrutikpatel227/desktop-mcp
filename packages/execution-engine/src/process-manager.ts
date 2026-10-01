import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

type Managed = {
  id: string;
  pid: number;
  command: string;
  startedAt: string;
  stdout: string;
  stderr: string;
  running: boolean;
  exitCode?: number | null;
  child: ChildProcessWithoutNullStreams;
};

const processes = new Map<string, Managed>();

export function startManaged(command: string, cwd: string) {
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
    cwd, windowsHide: true
  });
  const id = 'proc_' + Math.random().toString(36).slice(2, 10);
  const state: Managed = { id, pid: child.pid ?? -1, command, startedAt: new Date().toISOString(), stdout: '', stderr: '', running: true, child };
  child.stdout.on('data', data => { state.stdout = (state.stdout + data.toString()).slice(-100000); });
  child.stderr.on('data', data => { state.stderr = (state.stderr + data.toString()).slice(-100000); });
  child.on('exit', code => { state.running = false; state.exitCode = code; });
  processes.set(id, state);
  return { id, pid: state.pid, command, startedAt: state.startedAt };
}

export function listManaged() {
  return [...processes.values()].map(p => ({ id: p.id, pid: p.pid, command: p.command, startedAt: p.startedAt, running: p.running, exitCode: p.exitCode }));
}

export function getManaged(id: string) {
  const p = processes.get(id);
  if (!p) return null;
  return { id: p.id, pid: p.pid, command: p.command, startedAt: p.startedAt, running: p.running, exitCode: p.exitCode, stdout: p.stdout, stderr: p.stderr };
}

export function stopManaged(id: string) {
  const p = processes.get(id);
  if (!p) return false;
  p.child.kill();
  processes.delete(id);
  return true;
}

export function stopAllManaged() {
  const ids = [...processes.keys()];
  for (const id of ids) stopManaged(id);
  return ids.length;
}
