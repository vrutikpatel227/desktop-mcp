import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const candidates = [
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
let executablePath: string | undefined;
for (const candidate of candidates) {
  try { await fs.access(candidate); executablePath = candidate; break; } catch {}
}

const browser = await chromium.launch({ headless: true, executablePath });
try {
  const credentials = process.env.DASHBOARD_AUTH_USER && process.env.DASHBOARD_AUTH_PASSWORD
    ? { username: process.env.DASHBOARD_AUTH_USER, password: process.env.DASHBOARD_AUTH_PASSWORD }
    : undefined;
  const context = await browser.newContext({ httpCredentials: credentials });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const notFound: string[] = [];
  const failed: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('response', response => { if (response.status() === 404) notFound.push(response.url()); });
  page.on('requestfailed', request => failed.push(request.url() + ' :: ' + (request.failure()?.errorText ?? 'unknown')));

  await page.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle', timeout: 30_000 });
  const homeText = await page.locator('body').innerText();
  const homeHasTitle = homeText.includes('Developer Control Plane');
  const homeHasStatus = homeText.includes('AGENT STATUS');
  const homeDialog = await page.locator('[data-nextjs-dialog], #webpack-dev-server-client-overlay').count();

  await page.goto('http://127.0.0.1:3001/devices', { waitUntil: 'networkidle', timeout: 30_000 });
  const devicesText = await page.locator('body').innerText();
  const devicesHasPair = devicesText.includes('PAIR DEVICE');
  const devicesHasList = devicesText.includes('CONNECTED DEVICES');
  const devicesDialog = await page.locator('[data-nextjs-dialog], #webpack-dev-server-client-overlay').count();

  await page.screenshot({ path: 'data/dashboard-verification.png', fullPage: true });
  console.log(JSON.stringify({
    homeHasTitle, homeHasStatus, homeDialog,
    devicesHasPair, devicesHasList, devicesDialog,
    consoleErrors,
    notFound,
    failed,
    screenshot: 'data/dashboard-verification.png'
  }, null, 2));

  if (!homeHasTitle || !homeHasStatus || homeDialog || !devicesHasPair || !devicesHasList || devicesDialog || consoleErrors.length) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
