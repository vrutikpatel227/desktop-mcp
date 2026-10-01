import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { assertWorkspace } from '../../security/src/security.js';

const execFileAsync = promisify(execFile);

const templates: Record<string, { bin: string; args: (name: string) => string[] }> = {
  'vite-react': {
    bin: 'npm.cmd',
    args: name => ['create', 'vite@latest', name, '--', '--template', 'react-ts']
  },
  'nextjs': {
    bin: 'npx.cmd',
    args: name => ['create-next-app@latest', name, '--ts', '--tailwind', '--eslint', '--app', '--src-dir', '--use-npm', '--no-import-alias']
  }
};

export async function createProject(kind: string, parent: string, name: string) {
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(name)) throw new Error('INVALID_PROJECT_NAME');
  const config = templates[kind];
  if (!config) throw new Error('PROJECT_TEMPLATE_UNSUPPORTED');
  const cwd = assertWorkspace(parent);
  const result = await execFileAsync(config.bin, config.args(name), {
    cwd, windowsHide: true, timeout: 600_000, maxBuffer: 1_000_000
  });
  return {
    path: path.join(cwd, name),
    kind,
    output: (result.stdout + (result.stderr ? '\n' + result.stderr : '')).slice(0, 1_000_000)
  };
}
