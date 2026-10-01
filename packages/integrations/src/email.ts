import { getSecret } from '../../auth/src/secrets.js';

async function accessToken(secretName: string, envName: string) {
  const value = await getSecret(secretName) ?? process.env[envName];
  if (!value) throw new Error(envName + '_NOT_CONFIGURED');
  return value;
}

export async function gmailRecent(maxResults = 10) {
  const token = await accessToken('gmail-access-token', 'GMAIL_ACCESS_TOKEN');
  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=' + maxResults;
  const res = await fetch(url, { headers: { authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('GMAIL_HTTP_' + res.status);
  const data = await res.json() as { messages?: Array<{ id: string; threadId?: string }> };
  return { messages: data.messages ?? [] };
}

export async function gmailGetMessage(id: string) {
  const token = await accessToken('gmail-access-token', 'GMAIL_ACCESS_TOKEN');
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + encodeURIComponent(id) + '?format=metadata', {
    headers: { authorization: 'Bearer ' + token }
  });
  if (!res.ok) throw new Error('GMAIL_MESSAGE_HTTP_' + res.status);
  return res.json();
}

export async function gmailSend(to: string, subject: string, body: string) {
  const token = await accessToken('gmail-access-token', 'GMAIL_ACCESS_TOKEN');
  const raw = Buffer.from(
    'To: ' + to + '\r\nSubject: ' + subject +
    '\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n' + body
  ).toString('base64url');
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ raw })
  });
  if (!res.ok) throw new Error('GMAIL_SEND_HTTP_' + res.status);
  return res.json();
}

export async function outlookRecent(top = 10) {
  const token = await accessToken('outlook-access-token', 'OUTLOOK_ACCESS_TOKEN');
  const res = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=' + top + '&$orderby=receivedDateTime%20desc&$select=id,subject,from,receivedDateTime,isRead', {
    headers: { authorization: 'Bearer ' + token }
  });
  if (!res.ok) throw new Error('OUTLOOK_HTTP_' + res.status);
  return res.json();
}

export async function outlookGetMessage(id: string) {
  const token = await accessToken('outlook-access-token', 'OUTLOOK_ACCESS_TOKEN');
  const res = await fetch('https://graph.microsoft.com/v1.0/me/messages/' + encodeURIComponent(id), {
    headers: { authorization: 'Bearer ' + token }
  });
  if (!res.ok) throw new Error('OUTLOOK_MESSAGE_HTTP_' + res.status);
  return res.json();
}
