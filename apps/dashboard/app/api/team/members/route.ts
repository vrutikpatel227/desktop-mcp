import { NextRequest, NextResponse } from 'next/server';

async function gateway(method: string, path: string, body?: unknown) {
  const base = process.env.DESKTOP_MCP_GATEWAY_URL ?? 'http://127.0.0.1:8790';
  const token = process.env.DESKTOP_MCP_ADMIN_TOKEN ?? 'change-me-admin';
  return fetch(base + path, {
    method,
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store'
  });
}

export async function GET() {
  try { const r = await gateway('GET', '/api/team/members'); return NextResponse.json(await r.json(), { status: r.status }); }
  catch { return NextResponse.json({ error: 'GATEWAY_OFFLINE' }, { status: 502 }); }
}

export async function POST(request: NextRequest) {
  try {
    const r = await gateway('POST', '/api/team/members', await request.json());
    return NextResponse.json(await r.json(), { status: r.status });
  } catch { return NextResponse.json({ error: 'GATEWAY_OFFLINE' }, { status: 502 }); }
}
