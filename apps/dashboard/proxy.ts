import { NextRequest, NextResponse } from 'next/server';

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Desktop MCP Dashboard"', 'Cache-Control': 'no-store' }
  });
}

function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

export function proxy(request: NextRequest) {
  const user = process.env.DASHBOARD_AUTH_USER;
  const password = process.env.DASHBOARD_AUTH_PASSWORD;
  if (!user || !password) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Dashboard authentication is not configured.', { status: 503 });
    }
    return NextResponse.next();
  }

  const header = request.headers.get('authorization');
  if (!header?.startsWith('Basic ')) return unauthorized();

  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(':');
    if (separator < 0) return unauthorized();
    const candidateUser = decoded.slice(0, separator);
    const candidatePassword = decoded.slice(separator + 1);
    if (!same(candidateUser, user) || !same(candidatePassword, password)) return unauthorized();
    return NextResponse.next();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icon.svg).*)']
};
