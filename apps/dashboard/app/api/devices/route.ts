import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gateway = process.env.DESKTOP_MCP_GATEWAY_URL ?? 'http://127.0.0.1:8790';
  const token = process.env.DESKTOP_MCP_ADMIN_TOKEN ?? 'change-me-admin';
  try {
    const response = await fetch(gateway + '/api/devices', {
      cache: 'no-store',
      headers: { authorization: 'Bearer ' + token }
    });
    if (!response.ok) return NextResponse.json({ error: 'GATEWAY_HTTP_' + response.status }, { status: 502 });
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ error: 'GATEWAY_OFFLINE' }, { status: 502 });
  }
}
