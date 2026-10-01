import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { issueToken } from './token.js';
import { dbQuery, postgresEnabled } from '../../storage/src/postgres.js';

const storeFile = path.resolve(process.env.DESKTOP_MCP_DATA_DIR ?? './data', 'oauth-clients.json');

type Client = {
  clientId: string;
  redirectUris: string[];
  clientName?: string;
};

type AuthCode = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  expiresAt: number;
};

const clients = new Map<string, Client>();
const codes = new Map<string, AuthCode>();

function loadClients() {
  try {
    const raw = fs.readFileSync(storeFile, 'utf8');
    for (const item of JSON.parse(raw) as Client[]) clients.set(item.clientId, item);
  } catch {}
}

function persistClients() {
  fs.mkdirSync(path.dirname(storeFile), { recursive: true });
  fs.writeFileSync(storeFile, JSON.stringify([...clients.values()], null, 2), 'utf8');
}loadClients();

function base64url(buffer: Buffer) {
  return buffer.toString('base64url');
}

export function oauthMetadata(issuer: string) {
  return {
    issuer,
    authorization_endpoint: issuer + '/oauth/authorize',
    token_endpoint: issuer + '/oauth/token',
    registration_endpoint: issuer + '/oauth/register',
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none']
  };
}

export async function registerClient(redirectUris: string[], clientName?: string) {
  if (redirectUris.length === 0 || redirectUris.length > 10) throw new Error('INVALID_REDIRECT_URIS');
  for (const value of redirectUris) {
    const uri = new URL(value);
    const loopback = ['localhost', '127.0.0.1', '::1'].includes(uri.hostname);
    if (uri.protocol !== 'https:' && !(uri.protocol === 'http:' && loopback)) throw new Error('REDIRECT_URI_MUST_USE_HTTPS');
  }

  const clientId = 'mcp_' + base64url(randomBytes(18));
  const client = { clientId, redirectUris, clientName };  if (postgresEnabled()) {
    await dbQuery(
      'INSERT INTO desktop_oauth_clients (client_id,client_name,redirect_uris) VALUES ($1,$2,$3::jsonb)',
      [clientId, clientName ?? null, JSON.stringify(redirectUris)]
    );
  } else {
    clients.set(clientId, client);
    persistClients();
  }

  return {
    client_id: clientId,
    client_name: clientName,
    redirect_uris: redirectUris,
    token_endpoint_auth_method: 'none'
  };
}

async function getClient(clientId: string) {
  if (postgresEnabled()) {
    const result = await dbQuery('SELECT client_id,client_name,redirect_uris FROM desktop_oauth_clients WHERE client_id=$1', [clientId]);
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      clientId: row.client_id as string,
      clientName: row.client_name ? String(row.client_name) : undefined,
      redirectUris: Array.isArray(row.redirect_uris) ? row.redirect_uris.map(String) : []
    };
  }
  return clients.get(clientId);
}

function codeHash(code: string) {
  return createHash('sha256').update(code).digest('hex');
}export async function authorize(params: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope?: string;
}) {
  const client = await getClient(params.clientId);
  if (!client || !client.redirectUris.includes(params.redirectUri)) throw new Error('INVALID_CLIENT');
  const redirect = new URL(params.redirectUri);
  if (!['http:', 'https:'].includes(redirect.protocol)) throw new Error('REDIRECT_URI_SCHEME_BLOCKED');
  if (!params.codeChallenge) throw new Error('PKCE_REQUIRED');

  const requestedScopes = (params.scope ?? 'mcp').split(/\s+/).filter(Boolean);
  const scope = requestedScopes.filter(value => value === 'mcp').join(' ') || 'mcp';
  const code = base64url(randomBytes(32));
  const expiresAt = Date.now() + 5 * 60_000;

  if (postgresEnabled()) {
    await dbQuery(
      'INSERT INTO desktop_oauth_codes (code_hash,client_id,redirect_uri,code_challenge,scope,expires_at) VALUES ($1,$2,$3,$4,$5,$6)',
      [codeHash(code), client.clientId, params.redirectUri, params.codeChallenge, scope, new Date(expiresAt)]
    );
  } else {
    for (const [key, value] of codes) if (value.expiresAt < Date.now()) codes.delete(key);
    codes.set(code, { clientId: client.clientId, redirectUri: params.redirectUri, codeChallenge: params.codeChallenge, scope, expiresAt });
  }
  return code;
}export async function exchangeCode(params: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  const expected = base64url(createHash('sha256').update(params.codeVerifier).digest());

  if (postgresEnabled()) {
    const deleted = await dbQuery(
      'DELETE FROM desktop_oauth_codes WHERE code_hash=$1 AND client_id=$2 AND redirect_uri=$3 AND code_challenge=$4 AND expires_at>NOW() RETURNING scope',
      [codeHash(params.code), params.clientId, params.redirectUri, expected]
    );
    const row = deleted.rows[0];
    if (!row) throw new Error('INVALID_GRANT');
    const scope = String(row.scope);
    const token = await issueToken('user', scope.split(/\s+/).filter(Boolean));
    return { access_token: token, token_type: 'Bearer', expires_in: 900, scope };
  }

  const item = codes.get(params.code);
  if (!item || item.expiresAt < Date.now()) throw new Error('INVALID_GRANT');
  if (item.clientId !== params.clientId || item.redirectUri !== params.redirectUri || expected !== item.codeChallenge) throw new Error('INVALID_GRANT');
  codes.delete(params.code);

  const token = await issueToken('user', item.scope.split(/\s+/).filter(Boolean));
  return { access_token: token, token_type: 'Bearer', expires_in: 900, scope: item.scope };
}
