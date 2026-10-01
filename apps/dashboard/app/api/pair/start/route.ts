import { NextResponse } from 'next/server';

export async function POST() {
  const gateway = process.env.DESKTOP_MCP_GATEWAY_URL ?? 'http://127.0.0.1:8790';
  const token = process.env.DESKTOP_MCP_ADMIN_TOKEN ?? 'change-me-admin';
  try {
    const response = await fetch(gateway + '/api/pair/start', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + token }
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ error: 'GATEWAY_OFFLINE' }, { status: 502 });
  }
}
