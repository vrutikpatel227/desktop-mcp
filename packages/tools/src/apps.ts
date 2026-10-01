import { execFile } from 'node:child_process';

const ALLOWED: Record<string, { executable: string; processName: string }> = {
  vscode: { executable: 'code.exe', processName: 'Code' },
  chrome: { executable: 'chrome.exe', processName: 'chrome' },
  edge: { executable: 'msedge.exe', processName: 'msedge' },
  powershell: { executable: 'powershell.exe', processName: 'powershell' }
};

export async function launchApplication(name: string, args: string[] = []) {
  const app = ALLOWED[name.toLowerCase()];
  if (!app) throw new Error('APPLICATION_NOT_ALLOWED');
  const child = await new Promise<number>((resolve, reject) => {
    const process = execFile(app.executable, args, { windowsHide: true }, error => {
      if (error) reject(error);
    });
    process.once('spawn', () => resolve(process.pid ?? -1));
  });
  return { name, pid: child };
}

export async function closeApplication(name: string) {
  const app = ALLOWED[name.toLowerCase()];
  if (!app) throw new Error('APPLICATION_NOT_ALLOWED');
  await new Promise<void>((resolve, reject) => {
    execFile('taskkill.exe', ['/IM', app.executable, '/T', '/F'], { windowsHide: true }, error => {
      if (error && !String(error.message).includes('not found')) reject(error); else resolve();
    });
  });
  return { name, closed: true };
}

export async function focusApplication(name: string) {
  const app = ALLOWED[name.toLowerCase()];
  if (!app) throw new Error('APPLICATION_NOT_ALLOWED');
  const script = "$ws = New-Object -ComObject WScript.Shell; $ws.AppActivate('" + app.processName.replace(/'/g, "''") + "')";
  await new Promise<void>((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true }, error => {
      if (error) reject(error); else resolve();
    });
  });
  return { name, focused: true };
}
