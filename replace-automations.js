const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

// Add imports
code = code.replace(
  'import { getClientDetails, uploadClientPhoto } from "@/lib/actions/clients";',
  'import { getClientDetails, uploadClientPhoto } from "@/lib/actions/clients";\nimport { getRemindersForTomorrow } from "@/lib/actions/automations";'
);

const newComponent = `
function Automations({ go }: { go: (v: View) => void }) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRemindersForTomorrow().then(res => {
      setReminders(res);
      setLoading(false);
    });
  }, []);

  const openWhatsApp = (phone: string, message: string, index: number) => {
    const cleanPhone = phone.replace(/\\D/g, "");
    const url = \`https://wa.me/55\${cleanPhone}?text=\${encodeURIComponent(message)}\`;
    window.open(url, "_blank");
    
    // Mark as sent visually
    setReminders(curr => curr.map((r, i) => i === index ? { ...r, sent: true } : r));
  };

  return (
    <main className="page-content">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-dark">Disparos de WhatsApp</h1>
          <p className="text-muted">Lembretes de confirmação para os agendamentos de amanhã.</p>
        </div>
        <button onClick={() => { setLoading(true); getRemindersForTomorrow().then(res => { setReminders(res); setLoading(false); }) }} className="btn-outline">
          <Calendar size={16} /> Atualizar fila
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Metric label="Lembretes pendentes" value={reminders.filter(r => !r.sent).length.toString()} detail="Para os agendamentos de amanhã" icon={MessageCircle} />
        <Metric label="Já enviados" value={reminders.filter(r => r.sent).length.toString()} detail="Confirmados no WhatsApp Web" icon={Check} />
        <Metric onClick={() => go("agenda")} label="Agendamentos vazios" value="0" detail="Clientes sem celular" icon={Users} />
      </div>

      <section className="card">
        <SectionTitle title="Fila de Mensagens" subtitle="Clique em Enviar para abrir o WhatsApp Web com o texto pronto." />
        
        {loading ? (
          <div className="py-12 flex justify-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div></div>
        ) : reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-[#E7EDF3] rounded-lg mt-4">
            <p className="text-muted mb-2">A fila está vazia.</p>
            <p className="text-sm text-muted">Não há agendamentos válidos para amanhã ou eles já foram confirmados.</p>
          </div>
        ) : (
          <div className="space-y-4 mt-6">
            {reminders.map((r, i) => (
              <div key={r.id} className={\`p-4 rounded-lg border \${r.sent ? 'border-emerald-200 bg-emerald-50/50' : 'border-[#E7EDF3] bg-surface'}\`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{r.clientName}</h3>
                    <p className="text-xs text-muted">Amanhã às {r.time} · {r.services}</p>
                  </div>
                  <Badge tone={r.sent ? "success" : "warning"}>{r.sent ? "Enviado" : "Pendente"}</Badge>
                </div>
                
                <div className="bg-white p-3 rounded border border-[#E7EDF3] text-sm text-ink font-sans relative">
                  <div className="absolute top-0 right-0 bottom-0 w-1 bg-green-500 rounded-r"></div>
                  {r.message}
                </div>
                
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => {
                    navigator.clipboard.writeText(r.message);
                    alert("Mensagem copiada!");
                  }} className="btn-outline py-1.5 px-3 text-xs">
                    <Copy size={14} /> Copiar texto
                  </button>
                  <button 
                    onClick={() => openWhatsApp(r.phone, r.message, i)}
                    className="btn-primary bg-green-600 hover:bg-green-700 border-green-600 py-1.5 px-3 text-xs"
                  >
                    <MessageCircle size={14} /> {r.sent ? "Reenviar WhatsApp" : "Enviar WhatsApp"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
`;

code = code.replace(/function Automations\([\s\S]*?<\/main> }/, newComponent);

// Remove 'data' and other unused props from Automations call in NailStudioApp
code = code.replace(
  'if (view === "automations") return <Automations data={automationRows} onNew={() => openEntity("automation", "create")} onAction={(mode, index) => openEntity("automation", mode, index)} onDelete={() => notify("Status da automação atualizado.")} go={setView} />;',
  'if (view === "automations") return <Automations go={setView} />;'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
