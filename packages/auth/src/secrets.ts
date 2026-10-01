import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

function dataPath(name: string) {
  return path.resolve(process.env.DESKTOP_MCP_DATA_DIR ?? './data', name);
}

const keyFile = () => dataPath('secrets-key');
const storeFile = () => dataPath('secrets.json');

async function key() {
  if (process.env.DESKTOP_MCP_SECRET_KEY) {
    return createHash('sha256').update(process.env.DESKTOP_MCP_SECRET_KEY).digest();
  }
  const file = keyFile();
  try { return new Uint8Array(await fs.readFile(file)); }
  catch {
    const value = randomBytes(32);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, value);
    return value;
  }
}

async function readStore(): Promise<Record<string, string>> {
  try { return JSON.parse(await fs.readFile(storeFile(), 'utf8')) as Record<string, string>; }
  catch { return {}; }
}

export async function setSecret(name: string, value: string) {
  const k = await key();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', k, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const store = await readStore();
  store[name] = [iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
  const file = storeFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(store, null, 2), 'utf8');
}

export async function getSecret(name: string) {
  const store = await readStore();
  const encoded = store[name];
  if (!encoded) return undefined;
  const [ivText, tagText, dataText] = encoded.split('.');
  const decipher = createDecipheriv('aes-256-gcm', await key(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return decipher.update(Buffer.from(dataText, 'base64url')) + decipher.final('utf8');
}

export async function deleteSecret(name: string) {
  const store = await readStore();
  delete store[name];
  const file = storeFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(store, null, 2), 'utf8');
}
