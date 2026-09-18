const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/appointments.ts', 'utf8');

code = code.replace(
  '  if (itemError) {\n    console.error("Error creating appointment item:", itemError);\n  }\n\n  revalidatePath("/");',
  '  if (itemError) {\n    console.error("Error creating appointment item:", itemError);\n    return { success: false, error: "Falha ao registrar os serviços do agendamento: " + itemError.message };\n  }\n\n  revalidatePath("/");'
);

fs.writeFileSync('src/lib/actions/appointments.ts', code);
