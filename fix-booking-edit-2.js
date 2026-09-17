const fs = require('fs');
const uiPath = 'src/components/nail-studio-app.tsx';
let uiContent = fs.readFileSync(uiPath, 'utf8');

// Fix the map(name => ...)
uiContent = uiContent.replace(
  'const initialServiceIds = initialServiceNames.map(name => services.find(s => s.name === name)?.id).filter(Boolean);',
  'const initialServiceIds = initialServiceNames.map((name: string) => services.find((s: any) => s.name === name)?.id).filter(Boolean);'
);

// Fix the import
if (!uiContent.includes('updateAppointmentRecord')) {
  // It is used on line 905, but not imported.
  // Wait, let's just add it manually to the top of the file.
  uiContent = uiContent.replace(
    'import { getAppointments, createAppointmentRecord, cancelAppointmentRecord, updateAppointmentStatus }',
    'import { getAppointments, createAppointmentRecord, cancelAppointmentRecord, updateAppointmentStatus, updateAppointmentRecord }'
  );
} else if (!uiContent.includes('import { getAppointments, createAppointmentRecord, cancelAppointmentRecord, updateAppointmentStatus, updateAppointmentRecord }')) {
    uiContent = uiContent.replace(
        'import { getAppointments, createAppointmentRecord, cancelAppointmentRecord, updateAppointmentStatus }',
        'import { getAppointments, createAppointmentRecord, cancelAppointmentRecord, updateAppointmentStatus, updateAppointmentRecord }'
    );
}

fs.writeFileSync(uiPath, uiContent);
