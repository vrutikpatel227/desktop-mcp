import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

export async function verifyOidcToken(token: string) {
  const issuer = process.env.DESKTOP_MCP_OIDC_ISSUER;
  const audience = process.env.DESKTOP_MCP_OIDC_AUDIENCE;
  const jwksUrl = process.env.DESKTOP_MCP_OIDC_JWKS_URL;
  if (!issuer || !audience || !jwksUrl) throw new Error('OIDC_NOT_CONFIGURED');

  jwks ??= createRemoteJWKSet(new URL(jwksUrl));
  const { payload } = await jwtVerify(token, jwks, { issuer, audience });
  return mapClaims(payload);
}

function mapClaims(payload: JWTPayload) {
  const roles = Array.isArray(payload.roles) ? payload.roles.map(String) : [];
  const scopeText = typeof payload.scope === 'string' ? payload.scope : '';
  const scopes = scopeText.split(/\s+/).filter(Boolean);
  const role = roles.includes('Owner') ? 'Owner' : roles.includes('Admin') ? 'Admin' : roles.includes('Viewer') ? 'Viewer' : 'Developer';
  const roleScopes = role === 'Owner' || role === 'Admin' ? ['admin', 'developer'] : role === 'Viewer' ? ['viewer'] : ['developer'];
  return {
    sub: String(payload.sub),
    deviceId: 'oidc',
    scopes: [...new Set(['mcp', ...scopes, ...roleScopes])],
    role,
    claims: payload
  };
}
