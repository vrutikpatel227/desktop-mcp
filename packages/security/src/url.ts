import dns from 'node:dns/promises';
import net from 'node:net';

function privateIpv4(value: string) {
  const parts = value.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function privateIpv6(value: string) {
  const v = value.toLowerCase();
  return v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80:');
}

export async function assertSafeUrl(raw: string) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL_SCHEME_BLOCKED');

  const host = url.hostname.toLowerCase();
  const allowLocal = process.env.DESKTOP_MCP_ALLOW_LOCAL_BROWSER === 'true';
  if (allowLocal && (host === 'localhost' || host === '127.0.0.1' || host === '::1')) return url;

  if (host === 'localhost' || privateIpv4(host) || privateIpv6(host) || net.isIP(host)) {
    throw new Error('SSRF_BLOCKED');
  }

  const addresses = await dns.lookup(host, { all: true });
  for (const address of addresses) {
    if (net.isIP(address.address) === 4 && privateIpv4(address.address)) throw new Error('SSRF_BLOCKED');
    if (net.isIP(address.address) === 6 && privateIpv6(address.address)) throw new Error('SSRF_BLOCKED');
  }
  return url;
}
