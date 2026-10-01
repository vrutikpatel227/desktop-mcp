import { createHash, randomBytes } from 'node:crypto';

const base = 'http://127.0.0.1:8790';
const redirectUri = 'http://127.0.0.1:9999/callback';

const registration = await fetch(base + '/oauth/register', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ client_name: 'Desktop MCP OAuth Smoke', redirect_uris: [redirectUri] })
});
if (!registration.ok) throw new Error('registration failed');
const client = await registration.json() as { client_id: string };

const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const approve = new URL(base + '/oauth/approve');
approve.searchParams.set('client_id', client.client_id);
approve.searchParams.set('redirect_uri', redirectUri);
approve.searchParams.set('code_challenge', challenge);
approve.searchParams.set('scope', 'mcp');
approve.searchParams.set('state', 'smoke');

const authorization = await fetch(approve, { method: 'POST', redirect: 'manual' });
if (authorization.status !== 302) throw new Error('authorization failed: ' + authorization.status);
const location = authorization.headers.get('location');
if (!location) throw new Error('missing redirect');
const redirect = new URL(location);
const code = redirect.searchParams.get('code');
if (!code || redirect.searchParams.get('state') !== 'smoke') throw new Error('invalid authorization response');

const tokenRes = await fetch(base + '/oauth/token', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code,
    client_id: client.client_id,
    redirect_uri: redirectUri,
    code_verifier: verifier
  })
});
if (!tokenRes.ok) throw new Error('token exchange failed');
const tokens = await tokenRes.json() as { access_token: string };

const status = await fetch(base + '/api/status', {
  headers: { authorization: 'Bearer ' + tokens.access_token }
});
if (!status.ok) throw new Error('authenticated API call failed: ' + status.status);
console.log('OAUTH_PASS client=' + client.client_id);
console.log('STATUS=' + await status.text());
