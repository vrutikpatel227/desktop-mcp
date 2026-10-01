import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { assertWorkspace } from '../../../apps/desktop-agent/src/security.js';

const execFileAsync = promisify(execFile);

async function git(args: string[], cwd: string) {
  const dir = assertWorkspace(cwd);
  const result = await execFileAsync('git.exe', args, {
    cwd: dir, windowsHide: true, timeout: 120000, maxBuffer: 1_000_000
  });
  return { stdout: result.stdout, stderr: result.stderr };
}

export const gitStatus = (cwd: string) => git(['status', '--short', '--branch'], cwd);
export const gitDiff = (cwd: string) => git(['diff'], cwd);
export const gitLog = (cwd: string) => git(['log', '--oneline', '-20'], cwd);

export async function gitWrite(action: 'add' | 'commit' | 'pull' | 'push', cwd: string, message?: string) {
  if (process.env.DESKTOP_MCP_ALLOW_GIT_WRITE !== 'true') {
    throw new Error('GIT_WRITE_DISABLED');
  }
  if (action === 'add') return git(['add', '.'], cwd);
  if (action === 'commit') return git(['commit', '-m', message ?? 'Update from Desktop MCP'], cwd);
  return git([action], cwd);
}
