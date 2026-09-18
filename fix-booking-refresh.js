const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace(
  'import { createAppointmentRecord, cancelAppointmentRecord, updateAppointmentStatus } from "@/lib/actions/appointments";',
  'import { createAppointmentRecord, cancelAppointmentRecord, updateAppointmentStatus, getAppointments } from "@/lib/actions/appointments";'
);

code = code.replace(
  'setRows(v => [...v, { ...a, id: res.data.id }]);',
  'const fresh = await getAppointments(); setRows(fresh);'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
