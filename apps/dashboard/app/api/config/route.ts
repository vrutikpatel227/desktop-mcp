import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';

const file = path.resolve(process.env.DESKTOP_MCP_DATA_DIR ?? path.join(process.cwd(), '..', '..', 'data'), 'dashboard-settings.json');

const defaults = {
  workspace: process.env.DESKTOP_MCP_WORKSPACE ?? 'C:\\AI-Workspace',
  confirmationMode: 'balanced',
  allowLocalBrowser: process.env.DESKTOP_MCP_ALLOW_LOCAL_BROWSER === 'true',
  allowExternalWrites: process.env.DESKTOP_MCP_ALLOW_EXTERNAL_WRITES === 'true'
};

async function load() {
  try { return { ...defaults, ...JSON.parse(await fs.readFile(file, 'utf8')) }; }
  catch { return defaults; }
}

export async function GET() {
  return NextResponse.json(await load());
}

export async function POST(request: NextRequest) {
  try {
    const input = await request.json();
    const data = {
      workspace: String(input.workspace ?? defaults.workspace),
      confirmationMode: ['safe', 'balanced', 'developer'].includes(input.confirmationMode) ? input.confirmationMode : 'balanced',
      allowLocalBrowser: Boolean(input.allowLocalBrowser),
      allowExternalWrites: Boolean(input.allowExternalWrites)
    };
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'INVALID_CONFIG' }, { status: 400 });
  }
}