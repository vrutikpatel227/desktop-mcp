import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.DESKTOP_MCP_AGENT_URL ?? 'http://127.0.0.1:8788';
  const token = process.env.DESKTOP_MCP_AGENT_TOKEN ?? 'change-me';

  try {
    const response = await fetch(url + '/health', {
      cache: 'no-store',
      headers: { authorization: 'Bearer ' + token }
    });
    if (!response.ok) return NextResponse.json({ ok: false, error: 'AGENT_HTTP_' + response.status }, { status: 502 });
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'AGENT_OFFLINE' }, { status: 502 });
  }
}
