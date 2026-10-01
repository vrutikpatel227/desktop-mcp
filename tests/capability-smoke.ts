async function call(operation: string, args: Record<string, unknown> = {}) {
  const res = await fetch('http://127.0.0.1:8788/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer change-me' },
    body: JSON.stringify({ operation, args })
  });
  if (!res.ok) throw new Error(operation + ' HTTP ' + res.status);
  const data = await res.json() as any;
  return data;
}

const app = await call('app_launch', { name: 'powershell', args: ['-NoProfile', '-Command', 'exit'] });
if (!app.success) throw new Error('APP_LAUNCH_FAIL');

const project = await call('project_detect', { cwd: 'C:\\Users\\Vrutik\\Desktop\\Desktop MCP Server\\workspace' });
if (!project.success) throw new Error('PROJECT_DETECT_FAIL');

const metrics = await call('metrics');
if (!metrics.success || typeof metrics.result !== 'string') throw new Error('METRICS_FAIL');

const secret = await call('secret_get', { name: 'nonexistent-smoke-secret' });
if (!secret.success || secret.result.configured !== false || secret.result.masked !== null) throw new Error('SECRET_METADATA_FAIL');

const github = await call('github_status');
if (!github.success && github.error?.code !== 'GITHUB_TOKEN_NOT_CONFIGURED') throw new Error('GITHUB_FAILSAFE_FAIL');

const gmail = await call('gmail_recent', { maxResults: 1 });
if (gmail.success || !String(gmail.error?.code ?? '').includes('GMAIL')) throw new Error('GMAIL_FAILSAFE_FAIL');

console.log('CAPABILITY_SMOKE_PASS');
console.log(JSON.stringify({ apps: app.result, project: project.result, github: github.result, metrics: 'ok', secret: 'masked', gmail: 'safe-not-configured' }));
