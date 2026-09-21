const fs = require('fs');

const mainPath = 'src/components/nail-studio-app.tsx';
let mainCode = fs.readFileSync(mainPath, 'utf8');

const startIdx = mainCode.indexOf('function Agenda(');
if (startIdx === -1) {
  console.log("Not found");
  process.exit(1);
}

// Find the ending '}' of the Agenda function.
// It is followed by `function Attendance(`
const nextFuncIdx = mainCode.indexOf('function Attendance(', startIdx);
let endIdx = mainCode.lastIndexOf('}', nextFuncIdx) + 1;

let agendaCode = mainCode.substring(startIdx, endIdx);

// Remove agendaCode from mainCode
mainCode = mainCode.substring(0, startIdx) + mainCode.substring(endIdx);

// We need to add `import { Agenda } from "./dashboard/agenda";` at the top
mainCode = 'import { Agenda } from "./dashboard/agenda";\n' + mainCode;

fs.writeFileSync(mainPath, mainCode);

const newAgendaCode = `import React, { useState } from "react";
import { Plus, ArrowRight, Search, CalendarDays } from "lucide-react";
import { Appointment } from "@/lib/types";

// Note: Badge, SectionTitle, statusTone are needed here.
// But they are defined in nail-studio-app.tsx.
// We must extract them or pass them as props, OR export them from nail-studio-app.tsx.
// Since we are refactoring, it's better to move shared components to a UI folder, or just export them from nail-studio-app.tsx for now.
// Actually, it's better to just copy them to a shared file or export them.
`;

console.log("Length of extracted:", agendaCode.length);
fs.writeFileSync('src/components/dashboard/agenda.tsx', newAgendaCode + "\nexport " + agendaCode);
