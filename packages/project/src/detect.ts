import fs from 'node:fs/promises';
import path from 'node:path';
import { assertWorkspace } from '../../security/src/risk-workspace.js';

export type ProjectInfo = {
  path: string;
  name?: string;
  framework: string;
  packageManager?: string;
  devCommand?: string;
  port?: number;
  scripts?: Record<string, string>;
};

export async function detectProject(target: string): Promise<ProjectInfo> {
  const cwd = assertWorkspace(target);
  const packageFile = path.join(cwd, 'package.json');
  try {
    const pkg = JSON.parse(await fs.readFile(packageFile, 'utf8')) as { name?: string; scripts?: Record<string,string>; dependencies?: Record<string,string>; devDependencies?: Record<string,string> };
    const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    let framework = 'Node.js';
    if (all.next) framework = 'Next.js';
    else if (all.react && all.vite) framework = 'React + Vite';
    else if (all.react) framework = 'React';
    else if (all.express) framework = 'Express';
    const scripts = pkg.scripts ?? {};
    const devCommand = scripts.dev ? 'npm run dev' : scripts.start ? 'npm start' : undefined;
    let port: number | undefined;
    const match = JSON.stringify(scripts).match(/(?:port|PORT)[^\d]{0,10}(\d{3,5})/);
    if (match) port = Number(match[1]);
    return { path: cwd, name: pkg.name, framework, packageManager: await detectManager(cwd), devCommand, port, scripts };
  } catch {
    try { await fs.access(path.join(cwd, 'requirements.txt')); return { path: cwd, framework: 'Python', packageManager: 'pip' }; }
    catch { return { path: cwd, framework: 'Unknown' }; }
  }
}

async function detectManager(cwd: string) {
  try { await fs.access(path.join(cwd, 'pnpm-lock.yaml')); return 'pnpm'; } catch {}
  try { await fs.access(path.join(cwd, 'yarn.lock')); return 'yarn'; } catch {}
  return 'npm';
}
