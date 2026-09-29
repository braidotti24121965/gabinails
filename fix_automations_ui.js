const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/automations.tsx', 'utf8');

const oldOpen = `  const openWhatsApp = async (phone: string, message: string, list: "reminders" | "overdue", index: number, clientId: string) => {
    const { markMessageSent } = await import("@/lib/actions/automations");
    await markMessageSent(clientId, list);
    const cleanPhone = phone.replace(/\\D/g, "");
    window.open(\`https://wa.me/55\${cleanPhone}?text=\${encodeURIComponent(message)}\`, "_blank");
    if (list === "reminders") {
      setReminders(r => r.map((item, i) => i === index ? { ...item, sent: true } : item));
    } else {
      setOverdue(o => o.map((item, i) => i === index ? { ...item, sent: true } : item));
    }
  };`;

const newOpen = `  const openWhatsApp = async (phone: string, message: string, list: "reminders" | "overdue", index: number, clientId: string) => {
    const { markMessageSent } = await import("@/lib/actions/automations");
    const res = await markMessageSent(clientId, list);
    if (!res.success) {
      alert("Erro ao salvar mensagem no banco de dados.");
      return;
    }
    const cleanPhone = phone.replace(/\\D/g, "");
    window.open(\`https://wa.me/55\${cleanPhone}?text=\${encodeURIComponent(message)}\`, "_blank");
    if (list === "reminders") {
      setReminders(r => r.map((item, i) => i === index ? { ...item, sent: true } : item));
    } else {
      setOverdue(o => o.map((item, i) => i === index ? { ...item, sent: true } : item));
    }
  };`;

code = code.replace(oldOpen, newOpen);
code = code.replace(/\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\n/g, '');
code = code.replace(/\/\/ eslint-disable-next-line react-hooks\/set-state-in-effect\n/g, '');

fs.writeFileSync('src/components/dashboard/automations.tsx', code);
