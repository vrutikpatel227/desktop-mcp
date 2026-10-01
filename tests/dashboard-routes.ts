import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const candidates = ['C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'];
let executablePath: string | undefined;
for (const candidate of candidates) { try { await fs.access(candidate); executablePath = candidate; break; } catch {} }
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({ httpCredentials: { username: 'dev', password: 'dev' } });
try {
  const page = await context.newPage();
  const routes = ['/', '/devices', '/tools', '/team', '/settings'];
  const results: any[] = [];
  for (const route of routes) {
    const errors: string[] = [];
    page.removeAllListeners('console');
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    const response = await page.goto('http://127.0.0.1:3001' + route, { waitUntil: 'networkidle', timeout: 30_000 });
    const text = await page.locator('body').innerText();
    results.push({ route, status: response?.status() ?? 0, content: text.trim().length > 0, errors });
  }
  console.log(JSON.stringify(results, null, 2));
  if (results.some(r => r.status >= 400 || !r.content || r.errors.length)) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
