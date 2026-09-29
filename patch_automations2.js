const fs = require('fs');

let code = fs.readFileSync('src/lib/actions/automations.ts', 'utf8');

// I will add querying message_jobs to getRemindersForTomorrow
const regexReminders = /export async function getRemindersForTomorrow\(orgName: string = "Studio"\) \{\n  const supabase = await createClient\(\);\n  if \(\!supabase\) return \[\];\n\n  const tomorrowStart = new Date\(\);\n  tomorrowStart\.setDate\(tomorrowStart\.getDate\(\) \+ 1\);\n  tomorrowStart\.setHours\(0,0,0,0\);\n  const tomorrowEnd = new Date\(tomorrowStart\);\n  tomorrowEnd\.setHours\(23,59,59,999\);\n\n  const \{ data \} = await supabase\n    \.from\("appointments"\)\n    \.select\(`\n      id,\n      starts_at,\n      client_id,\n      client:clients\(name, phone\),\n      items:appointment_items\(service:services\(name\)\)\n    `\)\n    \.eq\("status", "scheduled"\)\n    \.gte\("starts_at", tomorrowStart\.toISOString\(\)\)\n    \.lte\("starts_at", tomorrowEnd\.toISOString\(\)\);/;

const replaceReminders = `export async function getRemindersForTomorrow(orgName: string = "Studio") {
  const supabase = await createClient();
  if (!supabase) return [];

  const tomorrowStart = new Date();
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0,0,0,0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23,59,59,999);

  const { data } = await supabase
    .from("appointments")
    .select(\`
      id,
      starts_at,
      client_id,
      client:clients(name, phone),
      items:appointment_items(service:services(name)),
      message_jobs (id, status, payload)
    \`)
    .eq("status", "scheduled")
    .gte("starts_at", tomorrowStart.toISOString())
    .lte("starts_at", tomorrowEnd.toISOString());`;

code = code.replace(regexReminders, replaceReminders);

// Map "sent" from message_jobs
code = code.replace(
  'sent: false',
  'sent: Array.isArray(a.message_jobs) && a.message_jobs.some((job: any) => job.payload?.list === "reminders")'
);

// Do the same for getOverdueMaintenances
code = code.replace(
  '      client:clients(name, phone),\n      items:appointment_items(service:services(name, maintenance_days))\n    `)\n    .eq("status", "completed")',
  '      client:clients(name, phone),\n      items:appointment_items(service:services(name, maintenance_days)),\n      message_jobs (id, status, payload)\n    `)\n    .eq("status", "completed")'
);

code = code.replace(
  '      sent: false',
  '      sent: Array.isArray(a.message_jobs) && a.message_jobs.some((job: any) => job.payload?.list === "overdue")'
);

fs.writeFileSync('src/lib/actions/automations.ts', code);
