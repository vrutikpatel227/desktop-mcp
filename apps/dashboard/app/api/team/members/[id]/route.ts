import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const base = process.env.DESKTOP_MCP_GATEWAY_URL ?? 'http://127.0.0.1:8790';
  const token = process.env.DESKTOP_MCP_ADMIN_TOKEN ?? 'change-me-admin';
  try {
    const r = await fetch(base + '/api/team/members/' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: JSON.stringify(await request.json()),
      cache: 'no-store'
    });
    return NextResponse.json(await r.json(), { status: r.status });
  } catch { return NextResponse.json({ error: 'GATEWAY_OFFLINE' }, { status: 502 }); }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const base = process.env.DESKTOP_MCP_GATEWAY_URL ?? 'http://127.0.0.1:8790';
  const token = process.env.DESKTOP_MCP_ADMIN_TOKEN ?? 'change-me-admin';
  try {
    const r = await fetch(base + '/api/team/members/' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: { authorization: 'Bearer ' + token },
      cache: 'no-store'
    });
    return NextResponse.json(await r.json(), { status: r.status });
  } catch { return NextResponse.json({ error: 'GATEWAY_OFFLINE' }, { status: 502 }); }
}
