import fs from 'node:fs/promises';
import path from 'node:path';
import { assertNotProtected, assertWorkspace } from './security.js';

export async function listDirectory(target: string) {
  const dir = assertWorkspace(target);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.map(entry => ({
    name: entry.name,
    type: entry.isDirectory() ? 'directory' : 'file',
    path: path.join(dir, entry.name)
  }));
}

export async function readFile(target: string) {
  const file = assertWorkspace(target);
  assertNotProtected(file);
  return fs.readFile(file, 'utf8');
}

export async function createDirectory(target: string) {
  const dir = assertWorkspace(target);
  await fs.mkdir(dir, { recursive: true });
  return { path: dir };
}

export async function writeFile(target: string, content: string) {
  const file = assertWorkspace(target);
  assertNotProtected(file);
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
