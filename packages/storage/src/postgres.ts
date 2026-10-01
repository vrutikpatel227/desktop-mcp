import pg from 'pg';

const { Pool } = pg;
let pool: pg.Pool | undefined;
let initPromise: Promise<void> | undefined;

function getPool() {
  if (!process.env.DESKTOP_MCP_DATABASE_URL) throw new Error('DATABASE_URL_NOT_CONFIGURED');
  pool ??= new Pool({
    connectionString: process.env.DESKTOP_MCP_DATABASE_URL,
    max: Number(process.env.DESKTOP_MCP_DB_MAX_CONNECTIONS ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });
  return pool;
}

export function postgresEnabled() {
  return Boolean(process.env.DESKTOP_MCP_DATABASE_URL);
}

export async function dbQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values?: unknown[]) {
  await ensureSchema();
  return getPool().query<T>(text, values);
}

async function ensureSchema() {
  if (!postgresEnabled()) return;
  initPromise ??= (async () => {
    const p = getPool();
    await p.query('CREATE TABLE IF NOT EXISTS desktop_devices (id TEXT PRIMARY KEY, name TEXT NOT NULL, platform TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL, revoked BOOLEAN NOT NULL DEFAULT FALSE, token_version INTEGER NOT NULL DEFAULT 1, last_seen TIMESTAMPTZ)');
    await p.query('CREATE TABLE IF NOT EXISTS desktop_oauth_clients (client_id TEXT PRIMARY KEY, client_name TEXT, redirect_uris JSONB NOT NULL)');
    await p.query('CREATE TABLE IF NOT EXISTS desktop_oauth_codes (code_hash TEXT PRIMARY KEY, client_id TEXT NOT NULL, redirect_uri TEXT NOT NULL, code_challenge TEXT NOT NULL, scope TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL)');
    await p.query('CREATE TABLE IF NOT EXISTS desktop_mcp_team_members (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL)');
    await p.query('CREATE TABLE IF NOT EXISTS desktop_mcp_policy (id INTEGER PRIMARY KEY CHECK (id = 1), data JSONB NOT NULL)');
    await p.query('INSERT INTO desktop_mcp_policy (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING', [JSON.stringify({
      disabledTools: [], blockedCommands: [], maxRequestsPerMinute: 100, confirmationMode: 'balanced'
    })]);
  })();
  return initPromise;
}

export async function closePool() {
  if (pool) await pool.end();
  pool = undefined;
  initPromise = undefined;
}
export async function dbHealth() {
  if (!postgresEnabled()) return { enabled: false };
  const result = await dbQuery<{ now: string }>('SELECT NOW()::text AS now');
  return { enabled: true, now: result.rows[0].now };
}
