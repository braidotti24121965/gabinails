const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Re-add demoAppointments alias if missing
if (!content.includes('import { appointments as demoAppointments')) {
  content = content.replace(
    'import { appointments as initialAppointments,',
    'import { appointments as demoAppointments,'
  );
}

// 2. Fix Dashboard usage of initialAppointments -> demoAppointments
content = content.replace(
  '{initialAppointments.slice(1, 5).map((a, i)',
  '{demoAppointments.slice(1, 5).map((a, i)'
);

// 3. Fix the map variable 'item' -> 'a' in Agenda
content = content.replace(
  'onDelete={() => onCancel(index, item.id)}',
  'onDelete={() => onCancel(index, a.id)}'
);

// 4. Ensure import of appointments actions
if (!content.includes('import { createAppointmentRecord')) {
  content = content.replace(
    'import { createSpecialtyRecord } from "@/lib/actions/specialties";',
    'import { createSpecialtyRecord } from "@/lib/actions/specialties";\nimport { createAppointmentRecord, cancelAppointmentRecord } from "@/lib/actions/appointments";'
  );
}

fs.writeFileSync(path, content);
