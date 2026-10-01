import { randomUUID } from 'node:crypto';
import { dbQuery, postgresEnabled } from '../../storage/src/postgres.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export type Role = 'Owner' | 'Admin' | 'Developer' | 'Viewer';
export type Member = { id: string; email: string; name: string; role: Role; createdAt: string };

const file = path.resolve(process.env.DESKTOP_MCP_DATA_DIR ?? './data', 'team.json');

function assertRole(role: string): asserts role is Role {
  if (!['Owner', 'Admin', 'Developer', 'Viewer'].includes(role)) throw new Error('INVALID_ROLE');
}

async function readFileStore(): Promise<Member[]> {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) as Member[]; } catch { return []; }
}

async function writeFileStore(items: Member[]) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(items, null, 2), 'utf8');
}

export async function listMembers(): Promise<Member[]> {
  if (postgresEnabled()) {
    const result = await dbQuery('SELECT id,email,name,role,created_at FROM desktop_mcp_team_members ORDER BY created_at DESC');
    return result.rows.map(row => ({
      id: row.id, email: row.email, name: row.name,
      role: row.role as Role, createdAt: new Date(row.created_at).toISOString()
    }));
  }
  return readFileStore();
}

export async function addMember(email: string, name: string, role: Role) {
  assertRole(role);
  if (!email.includes('@') || email.length > 254) throw new Error('INVALID_EMAIL');
  if (!name.trim() || name.length > 120) throw new Error('INVALID_NAME');

  const member: Member = {
    id: 'usr_' + randomUUID().slice(0, 12),
    email, name, role, createdAt: new Date().toISOString()
  };

  if (postgresEnabled()) {
    await dbQuery(
      'INSERT INTO desktop_mcp_team_members (id,email,name,role,created_at) VALUES ($1,$2,$3,$4,$5)',
      [member.id, member.email, member.name, member.role, member.createdAt]
    );
    return member;
  }

  const items = await readFileStore();
  if (items.some(item => item.email.toLowerCase() === email.toLowerCase())) throw new Error('MEMBER_EXISTS');
  items.push(member);
  await writeFileStore(items);
  return member;
}

export async function setRole(id: string, role: Role) {
  assertRole(role);
  if (postgresEnabled()) {
    const result = await dbQuery('UPDATE desktop_mcp_team_members SET role=$2 WHERE id=$1 RETURNING id,email,name,role,created_at', [id, role]);
    const row = result.rows[0];
    if (!row) throw new Error('MEMBER_NOT_FOUND');
    return { id: row.id, email: row.email, name: row.name, role: row.role as Role, createdAt: new Date(row.created_at).toISOString() };
  }

  const items = await readFileStore();
  const member = items.find(item => item.id === id);
  if (!member) throw new Error('MEMBER_NOT_FOUND');
  member.role = role;
  await writeFileStore(items);
  return member;
}

export async function removeMember(id: string) {
  if (postgresEnabled()) {
    const result = await dbQuery('DELETE FROM desktop_mcp_team_members WHERE id=$1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  const items = await readFileStore();
  const next = items.filter(item => item.id !== id);
  if (next.length === items.length) return false;
  await writeFileStore(next);
  return true;
}
