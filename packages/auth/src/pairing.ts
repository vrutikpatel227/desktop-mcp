import { randomInt } from 'node:crypto';
import { getDeviceStore, type DeviceRecord } from '../../registry/src/device-store.js';
import { issueToken, verifyToken } from './token.js';

type Pending = { code: string; expiresAt: number };
export type Device = DeviceRecord;

const pending = new Map<string, Pending>();

export function startPairing() {
  const code = String(randomInt(100000, 1000000));
  const expiresAt = Date.now() + 5 * 60_000;
  pending.set(code, { code, expiresAt });
  return { code, expiresAt: new Date(expiresAt).toISOString() };
}

export async function completePairing(code: string, name: string, platform: string) {
  const item = pending.get(code);
  if (!item || item.expiresAt < Date.now()) throw new Error('PAIRING_CODE_INVALID');
  pending.delete(code);

  const device: Device = {
    id: 'dev_' + Math.random().toString(36).slice(2, 12),
    name, platform, createdAt: new Date().toISOString(),
    revoked: false, tokenVersion: 1
  };

  const store = await getDeviceStore();
  await store.add(device);
  return { device, token: await issueToken(device.id, ['device'], '30d', device.tokenVersion) };
}

export async function requireDevice(token: string) {
  const claims = await verifyToken(token);
  const store = await getDeviceStore();
  const device = await store.find(claims.deviceId);
  if (!device || device.revoked) throw new Error('DEVICE_REVOKED');
  if (claims.tokenVersion !== device.tokenVersion) throw new Error('DEVICE_TOKEN_ROTATED');
  return { claims, device };
}

export async function listDevices() {
  return (await getDeviceStore()).list();
}

export async function touchDevice(id: string) {
  return (await getDeviceStore()).update(id, { lastSeen: new Date().toISOString() });
}

export async function revokeDevice(id: string) {
  return (await getDeviceStore()).update(id, { revoked: true });
}

export async function rotateDeviceToken(id: string) {
  const store = await getDeviceStore();
  const device = await store.find(id);
  if (!device || device.revoked) throw new Error('DEVICE_NOT_FOUND');
  const tokenVersion = device.tokenVersion + 1;
  await store.update(id, { tokenVersion });
  return issueToken(id, ['device'], '30d', tokenVersion);
}
