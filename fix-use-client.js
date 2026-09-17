const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

if (lines[0].includes('import { updateAppointmentRecord') && lines[1] === '"use client";') {
  const temp = lines[0];
  lines[0] = lines[1];
  lines[1] = temp;
  fs.writeFileSync(path, lines.join('\n'));
}
