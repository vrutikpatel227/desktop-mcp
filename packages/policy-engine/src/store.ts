import { dbQuery, postgresEnabled } from '../../storage/src/postgres.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export type PolicyConfig = {
  disabledTools: string[];
  blockedCommands: string[];
  maxRequestsPerMinute: number;
  confirmationMode: 'safe' | 'balanced' | 'developer';
};

const defaults: PolicyConfig = {
  disabledTools: [],
  blockedCommands: [],
  maxRequestsPerMinute: 100,
  confirmationMode: 'balanced'
};

const file = path.resolve(process.env.DESKTOP_MCP_DATA_DIR ?? './data', 'policy.json');

export async function loadPolicy(): Promise<PolicyConfig> {
  if (postgresEnabled()) {
    const result = await dbQuery<{ data: PolicyConfig }>('SELECT data FROM desktop_mcp_policy WHERE id=1');
    return result.rows[0]?.data ?? defaults;
  }
  try { return { ...defaults, ...(JSON.parse(await fs.readFile(file, 'utf8')) as Partial<PolicyConfig>) }; }
  catch { return defaults; }
}

export async function savePolicy(input: Partial<PolicyConfig>) {
  const current = await loadPolicy();
  const next: PolicyConfig = {
    disabledTools: Array.isArray(input.disabledTools) ? input.disabledTools.map(String).slice(0, 100) : current.disabledTools,
    blockedCommands: Array.isArray(input.blockedCommands) ? input.blockedCommands.map(String).slice(0, 100) : current.blockedCommands,
    maxRequestsPerMinute: Math.max(1, Math.min(10000, Number(input.maxRequestsPerMinute ?? current.maxRequestsPerMinute))),
    confirmationMode: ['safe', 'balanced', 'developer'].includes(String(input.confirmationMode)) ? input.confirmationMode as PolicyConfig['confirmationMode'] : current.confirmationMode
  };

  if (postgresEnabled()) {
    await dbQuery(
      'INSERT INTO desktop_mcp_policy (id,data) VALUES (1,$1::jsonb) ON CONFLICT (id) DO UPDATE SET data=$1::jsonb',
      [JSON.stringify(next)]
    );
    return next;
  }

  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(next, null, 2), 'utf8');
  return next;
}
