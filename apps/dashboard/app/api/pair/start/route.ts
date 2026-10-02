import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() { return startPairing(); }
async function startPairing() {
  const gateway = process.env.DESKTOP_MCP_GATEWAY_URL ?? 'http://127.0.0.1:8790';
  const token = process.env.DESKTOP_MCP_ADMIN_TOKEN ?? 'change-me-admin';
  try {
    if (process.env.NODE_ENV === 'production' && !process.env.DESKTOP_MCP_ADMIN_TOKEN) return NextResponse.json({ error: 'ADMIN_TOKEN_MISSING' }, { status: 503 });
    const response = await fetch(gateway + '/api/pair/start', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + token, accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000)
    });
    const body = await response.text();
    let data: unknown;
    try { data = JSON.parse(body); } catch { data = { error: body.slice(0, 500) }; }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'GATEWAY_OFFLINE', detail: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
export async function POST() { return startPairing(); }



