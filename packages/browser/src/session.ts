import { chromium, type Browser, type Page } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { assertSafeUrl } from '../../security/src/url.js';

type Session = { id: string; browser: Browser; page: Page };
const sessions = new Map<string, Session>();

async function executablePath() {
  const configured = process.env.DESKTOP_MCP_BROWSER_EXECUTABLE;
  if (configured) return configured;
  const candidates = [
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const candidate of candidates) {
    try { await fs.access(candidate); return candidate; } catch {}
  }
  return undefined;
}

export async function openUrl(url: string) {
  const safeUrl = await assertSafeUrl(url);
  const id = 'browser_' + Math.random().toString(36).slice(2, 10);
  const browser = await chromium.launch({
    headless: true,
    executablePath: await executablePath()
  });
  const page = await browser.newPage();
  await page.route('**/*', async route => {
    try {
      await assertSafeUrl(route.request().url());
      await route.continue();
    } catch {
      await route.abort('blockedbyclient');
    }
  });
  await page.goto(safeUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  sessions.set(id, { id, browser, page });
  return { id, url: page.url(), title: await page.title() };
}

export function getSession(id: string) {
  const session = sessions.get(id);
  if (!session) throw new Error('BROWSER_SESSION_NOT_FOUND');
  return session;
}

export async function getPageText(id: string) {
  const { page } = getSession(id);
  return { url: page.url(), title: await page.title(), text: (await page.locator('body').innerText()).slice(0, 200_000) };
}

export async function navigate(id: string, url: string) {
  const { page } = getSession(id);
  const safeUrl = await assertSafeUrl(url);
  await page.goto(safeUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  return { url: page.url(), title: await page.title() };
}

export async function selectOption(id: string, selector: string, value: string) {
  const { page } = getSession(id);
  await page.locator(selector).first().selectOption(value, { timeout: 15_000 });
  return { selector, value, selected: true };
}

export async function click(id: string, selector: string) {
  const { page } = getSession(id);
  await page.locator(selector).first().click({ timeout: 15_000 });
  return { url: page.url() };
}

export async function submit(id: string, selector: string) {
  const { page } = getSession(id);
  await page.locator(selector).first().evaluate((element) => {
    const form = element.closest('form') as HTMLFormElement | null;
    if (!form) throw new Error('FORM_NOT_FOUND');
    form.requestSubmit();
  });
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  return { url: page.url() };
}
export async function typeText(id: string, selector: string, text: string) {
  const { page } = getSession(id);
  await page.locator(selector).first().fill(text, { timeout: 15_000 });
  return { selector, typed: true };
}

export async function waitForElement(id: string, selector: string, timeout = 15_000) {
  const { page } = getSession(id);
  await page.locator(selector).first().waitFor({ state: 'visible', timeout });
  return { selector, visible: true };
}

export async function screenshot(id: string) {
  const { page } = getSession(id);
  const buffer = await page.screenshot({ type: 'png', fullPage: true });
  return { mimeType: 'image/png', base64: buffer.toString('base64').slice(0, 1_000_000), url: page.url() };
}

export async function close(id: string) {
  const session = getSession(id);
  await session.browser.close();
  sessions.delete(id);
  return { closed: true, id };
}

export async function closeAll() {
  await Promise.all([...sessions.keys()].map(close));
}
