const fs = require('fs');

let code = fs.readFileSync('src/lib/actions/automations.ts', 'utf8');
code = code.replace(
  'sent: Array.isArray(a.message_jobs) && a.message_jobs.some((job: any) => job.payload?.list === "overdue")',
  'sent: Array.isArray((a as any).message_jobs) && (a as any).message_jobs.some((job: any) => job.payload?.list === "overdue")'
);

code = code.replace(
  'sent: Array.isArray(a.message_jobs) && a.message_jobs.some((job: any) => job.payload?.list === "reminders")',
  'sent: Array.isArray((a as any).message_jobs) && (a as any).message_jobs.some((job: any) => job.payload?.list === "reminders")'
);

fs.writeFileSync('src/lib/actions/automations.ts', code);
