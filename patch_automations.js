const fs = require('fs');

let code = fs.readFileSync('src/lib/actions/automations.ts', 'utf8');

// 1. Fix markMessageSent
code = code.replace(
  "client_id: clientId,\n    status: 'sent',\n    scheduled_at: new Date().toISOString(),\n    sent_at: new Date().toISOString()",
  "client_id: clientId,\n    channel: 'whatsapp',\n    provider: 'manual',\n    status: 'sent',\n    scheduled_at: new Date().toISOString(),\n    sent_at: new Date().toISOString(),\n    payload: { list, type: list === 'reminders' ? 'reminder' : 'overdue' }"
);

// We need list parameter in markMessageSent!
code = code.replace(
  'export async function markMessageSent(clientId: string) {',
  'export async function markMessageSent(clientId: string, list: string) {'
);

fs.writeFileSync('src/lib/actions/automations.ts', code);
