const response = await fetch('http://127.0.0.1:8788/execute', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer change-me' },
  body: JSON.stringify({ operation: 'browser_open_url', args: { url: 'https://example.com' } })
});
if (!response.ok) throw new Error('agent HTTP ' + response.status);
const opened = await response.json() as any;
if (!opened.success) throw new Error(JSON.stringify(opened));
const id = opened.result.id;
const textRes = await fetch('http://127.0.0.1:8788/execute', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer change-me' },
  body: JSON.stringify({ operation: 'browser_get_text', args: { id } })
});
const page = await textRes.json() as any;
if (!page.success) throw new Error(JSON.stringify(page));
const text = JSON.stringify(page.result);
if (!text.includes('Example Domain')) throw new Error('unexpected page text');
await fetch('http://127.0.0.1:8788/execute', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer change-me' },
  body: JSON.stringify({ operation: 'browser_close', args: { id } })
});
console.log('BROWSER_AGENT_PASS');
