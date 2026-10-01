import fs from 'node:fs/promises';
import path from 'node:path';
import { assertNotProtected, assertWorkspace } from './security.js';

const MAX_READ_BYTES = Number(process.env.DESKTOP_MCP_MAX_OUTPUT ?? 1_000_000);
const MAX_ENTRIES = Number(process.env.DESKTOP_MCP_MAX_ENTRIES ?? 1000);

export async function listDirectory(target: string) {
  const dir = assertWorkspace(target);
  assertNotProtected(dir);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.slice(0, MAX_ENTRIES).map(entry => ({
    name: entry.name,
    type: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other',
    path: path.join(dir, entry.name)
  }));
}

export async function readFile(target: string) {
  const file = assertWorkspace(target);
  assertNotProtected(file);
  const stat = await fs.stat(file);
  const handle = await fs.open(file, 'r');
  try {
    const length = Math.min(stat.size, MAX_READ_BYTES);
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return {
      content: buffer.subarray(0, bytesRead).toString('utf8'),
      sizeBytes: stat.size,
      truncated: stat.size > bytesRead
    };
  } finally {
    await handle.close();
  }
}

export async function createDirectory(target: string) {
  const dir = assertWorkspace(target);
  assertNotProtected(dir);
  await fs.mkdir(dir, { recursive: true });
  return { path: dir };
}

export async function writeFile(target: string, content: string) {
  const file = assertWorkspace(target);
  assertNotProtected(file);
  if (Buffer.byteLength(content, 'utf8') > MAX_READ_BYTES) throw new Error('PAYLOAD_TOO_LARGE');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, 'utf8');
  return { path: file, bytes: Buffer.byteLength(content, 'utf8') };
}

export async function deleteFile(target: string) {
  const file = assertWorkspace(target);
  assertNotProtected(file);
  await fs.rm(file, { force: true });
  return { path: file };
}

export async function deleteDirectory(target: string) {
  const dir = assertWorkspace(target);
  assertNotProtected(dir);
  if (path.resolve(dir) === path.resolve(process.env.DESKTOP_MCP_WORKSPACE ?? '')) throw new Error('WORKSPACE_DELETE_BLOCKED');
  await fs.rm(dir, { recursive: true, force: true });
  return { path: dir };
}

export async function moveFile(source: string, destination: string) {
  const from = assertWorkspace(source);
  const to = assertWorkspace(destination);
  assertNotProtected(from);
  assertNotProtected(to);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
  return { source: from, destination: to };
}

export async function copyFile(source: string, destination: string) {
  const from = assertWorkspace(source);
  const to = assertWorkspace(destination);
  assertNotProtected(from);
  assertNotProtected(to);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.cp(from, to, { recursive: true, force: true });
  return { source: from, destination: to };
}

async function walk(dir: string, results: string[], remaining: { value: number }) {
  if (remaining.value <= 0) return;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (remaining.value <= 0) break;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, results, remaining);
    } else if (entry.isFile()) {
      results.push(full);
      remaining.value -= 1;
    }
  }
}

export async function searchFiles(target: string, pattern: string) {
  const root = assertWorkspace(target);
  assertNotProtected(root);
  if (pattern.length > 200) throw new Error('INVALID_SEARCH_PATTERN');
  const regex = new RegExp(pattern, 'i');
  const files: string[] = [];
  await walk(root, files, { value: MAX_ENTRIES });
  return files.filter(file => regex.test(path.basename(file)));
}

export async function searchInFiles(target: string, query: string) {
  const root = assertWorkspace(target);
  assertNotProtected(root);
  if (query.length > 500) throw new Error('INVALID_SEARCH_QUERY');
  const regex = new RegExp(query, 'i');
  const files: string[] = [];
  await walk(root, files, { value: MAX_ENTRIES });
  const matches: Array<{ path: string; lines: Array<{ line: number; text: string }> }> = [];
  for (const file of files) {
    try {
      const text = (await fs.readFile(file, 'utf8')).split(/\r?\n/);
      const lines = text.map((line, index) => ({ line: index + 1, text: line })).filter(item => regex.test(item.text)).slice(0, 20);
      if (lines.length) matches.push({ path: file, lines });
      if (matches.length >= 100) break;
    } catch {}
  }
  return matches;
}
