const fs = require('fs');

let code = fs.readFileSync('src/lib/actions/automations.ts', 'utf8');

code = code.replace(
  'sent: Array.isArray((a as any).message_jobs) && (a as any).message_jobs.some((job: any) => job.payload?.list === "overdue")',
  'sent: Array.isArray((app as any).message_jobs) && (app as any).message_jobs.some((job: any) => job.payload?.list === "overdue")'
);

code = code.replace(
  'export async function markMessageSent(clientId: string, type: string) {',
  'export async function markMessageSent(clientId: string, list: string) {'
);

fs.writeFileSync('src/lib/actions/automations.ts', code);
