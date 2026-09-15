const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'function Agenda({ rows, onNew, onAttendance, onAction, onCancel }:',
  'function Agenda({ rows, onNew, onAttendance, onAction, onCancel, onStatusChange }:'
);

fs.writeFileSync(path, content);
