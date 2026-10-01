import { randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SignJWT, jwtVerify } from 'jose';

const secretPath = path.resolve(process.env.DESKTOP_MCP_DATA_DIR ?? './data', 'jwt-secret');
let cached: Uint8Array | undefined;

async function getSecret() {
  if (cached) return cached;
  if (process.env.DESKTOP_MCP_JWT_SECRET) {
    cached = new TextEncoder().encode(process.env.DESKTOP_MCP_JWT_SECRET);
    return cached;
  }
  try {
    cached = new Uint8Array(await fs.readFile(secretPath));
  } catch {
    cached = randomBytes(32);
    await fs.mkdir(path.dirname(secretPath), { recursive: true });
    await fs.writeFile(secretPath, cached);
  }
  return cached;
}

export type TokenClaims = { sub: string; deviceId: string; scopes: string[]; tokenVersion: number };

export async function issueToken(deviceId: string, scopes: string[] = ['mcp'], expiresIn: string | number = '15m', tokenVersion = 0) {
  return new SignJWT({ deviceId, scopes, tokenVersion })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(randomUUID())
    .setIssuer('desktop-mcp-local')
    .setAudience('desktop-mcp')
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(await getSecret());
}

export async function verifyToken(token: string): Promise<TokenClaims> {
  const { payload } = await jwtVerify(token, await getSecret(), {
    issuer: 'desktop-mcp-local', audience: 'desktop-mcp'
  });
  return {
    sub: String(payload.sub),
    deviceId: String(payload.deviceId),
    scopes: Array.isArray(payload.scopes) ? payload.scopes.map(String) : [],
    tokenVersion: Number(payload.tokenVersion ?? 0)
  };
}
