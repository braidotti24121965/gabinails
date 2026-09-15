const fs = require('fs');
const path = 'src/lib/actions/appointments.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'return { success: false, error: appError?.message || "Failed to create appointment" };',
  `if (appError?.message?.includes("appointments_no_overlap")) {
      return { success: false, error: "Este horário já está ocupado para esta profissional. Por favor, escolha outro horário." };
    }
    return { success: false, error: appError?.message || "Failed to create appointment" };`
);

fs.writeFileSync(path, content);
