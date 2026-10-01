import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const gateway = () => process.env.DESKTOP_MCP_GATEWAY_URL ?? 'http://127.0.0.1:8790';
const token = () => process.env.DESKTOP_MCP_ADMIN_TOKEN ?? 'change-me-admin';

async function proxy(method: string, request?: NextRequest) {
  const options: RequestInit = {
    method,
    headers: { authorization: 'Bearer ' + token(), ...(method === 'POST' ? { 'content-type': 'application/json' } : {}) },
    body: method === 'POST' && request ? await request.text() : undefined
  };
  try {
    const response = await fetch(gateway() + '/api/policy', options);
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ error: 'GATEWAY_OFFLINE' }, { status: 502 });
  }
}

export async function GET() { return proxy('GET'); }
export async function POST(request: NextRequest) { return proxy('POST', request); }
