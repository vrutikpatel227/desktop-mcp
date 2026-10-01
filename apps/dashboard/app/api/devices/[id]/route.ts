import { NextRequest, NextResponse } from 'next/server';

async function gatewayRequest(id: string, action: string, method: string) {
  const gateway = process.env.DESKTOP_MCP_GATEWAY_URL ?? 'http://127.0.0.1:8790';
  const token = process.env.DESKTOP_MCP_ADMIN_TOKEN ?? 'change-me-admin';
  return fetch(gateway + '/api/devices/' + encodeURIComponent(id) + '/' + action, {
    method,
    headers: { authorization: 'Bearer ' + token }
  });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const response = await gatewayRequest(id, 'revoke', 'POST');
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ error: 'GATEWAY_OFFLINE' }, { status: 502 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const response = await gatewayRequest(id, 'rotate', 'POST');
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ error: 'GATEWAY_OFFLINE' }, { status: 502 });
  }
}
