import { NextResponse } from 'next/server';

export async function POST() {
  const gateway = process.env.DESKTOP_MCP_GATEWAY_URL ?? 'http://127.0.0.1:8790';
  const token = process.env.DESKTOP_MCP_ADMIN_TOKEN ?? 'change-me-admin';
  try {
    const response = await fetch(gateway + '/api/pair/start', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + token },
      cache: 'no-store'
    });
    const body = await response.text();
    let data: unknown;
    try { data = JSON.parse(body); } catch { data = { error: body.slice(0, 500) }; }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'GATEWAY_OFFLINE', detail: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
