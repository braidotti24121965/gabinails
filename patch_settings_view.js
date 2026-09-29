const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

// 1. Add "settings" to View type
code = code.replace(
  'type View = "dashboard" | "agenda" | "clients" | "services" | "professionals" | "attendance" | "finance" | "inventory" | "automations" | "reports" | "booking";',
  'type View = "dashboard" | "agenda" | "clients" | "services" | "professionals" | "attendance" | "finance" | "inventory" | "automations" | "reports" | "booking" | "settings";'
);

// 2. Add to titles
code = code.replace(
  'const titles: Record<View, [string, string]> = {',
  'const titles: Record<View, [string, string]> = {\n  settings: ["Configurações", "Gerencie os dados e o acesso do seu salão."],'
);

// 3. Add Settings Component (I will append it before NailStudioApp)
const settingsComponent = `
function SettingsView({ tenant, updateToast }: { tenant: any; updateToast: (t: string) => void }) {
  const [orgName, setOrgName] = useState(tenant?.orgName || "");
  const [fullName, setFullName] = useState(tenant?.profileName || "");
  const [email, setEmail] = useState(tenant?.email || "");
  const [password, setPassword] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);

  async function handleSaveOrg() {
    setSavingOrg(true);
    const { updateOrganization, updateProfile } = await import("@/lib/actions/settings");
    await updateOrganization(orgName);
    await updateProfile(fullName);
    updateToast("Dados da empresa salvos! Atualize a página para ver os novos nomes no menu.");
    setSavingOrg(false);
  }

  async function handleSaveAccess() {
    if (!email) return alert("E-mail não pode ser vazio");
    setSavingAccess(true);
    const { updateAuthCredentials } = await import("@/lib/actions/settings");
    const res = await updateAuthCredentials(email, password || undefined);
    if (res.error) {
      alert("Erro ao atualizar credenciais: " + res.error);
    } else {
      updateToast(res.message || "Acesso atualizado!");
      setPassword("");
    }
    setSavingAccess(false);
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6">
      
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <div className="bg-primary/10 text-primary p-2 rounded-lg"><Settings size={20} /></div>
          <div>
            <h3 className="font-semibold text-lg text-ink">Dados do Salão</h3>
            <p className="text-sm text-muted">Informações públicas que aparecem no sistema</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Nome do Salão (SaaS)</label>
            <input className="field-input" value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Seu Nome (Proprietário/a)</label>
            <input className="field-input" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button onClick={handleSaveOrg} disabled={savingOrg} className="btn-primary">
            {savingOrg ? "Salvando..." : "Salvar Dados do Salão"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg"><Settings size={20} /></div>
          <div>
            <h3 className="font-semibold text-lg text-ink">Segurança e Acesso</h3>
            <p className="text-sm text-muted">Credenciais para login na plataforma</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-lg mb-6">
          <strong>Atenção:</strong> Ao alterar o seu e-mail, o sistema enviará um link de verificação para a sua nova caixa de entrada. Você precisará clicar nele para confirmar a troca.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">E-mail de Login</label>
            <input type="email" className="field-input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Nova Senha (Deixe em branco para não alterar)</label>
            <input type="password" placeholder="••••••••" className="field-input" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={handleSaveAccess} disabled={savingAccess} className="btn-primary bg-emerald-600 border-emerald-600 hover:bg-emerald-700">
            {savingAccess ? "Salvando..." : "Atualizar Acesso"}
          </button>
        </div>
      </div>

    </div>
  );
}
`;

code = code.replace(
  'export function NailStudioApp(',
  settingsComponent + '\nexport function NailStudioApp('
);

// 4. Update the Sidebar link for Configurações
code = code.replace(
  '<button onClick={() => setView("services")} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs text-white/65 hover:bg-white/10"><Settings size={16} />Configurações</button>',
  '<button onClick={() => setView("settings")} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs text-white/65 hover:bg-white/10"><Settings size={16} />Configurações</button>'
);

// 5. Add route to NailStudioApp
const oldDashboardReturn = 'if (view === "dashboard") return <Dashboard stats={initialStats} go={setView} appointments={rows} clients={clientRows} tenant={tenant} onAttendance={(a) => { setActiveAppointment(a); setView("attendance"); }} />;';
code = code.replace(
  oldDashboardReturn,
  oldDashboardReturn + '\n    if (view === "settings") return <SettingsView tenant={tenant} updateToast={(t) => { setToast(t); setTimeout(() => setToast(""), 3000); }} />;'
);

// We need to add tenant type to NailStudioApp props for email
code = code.replace(
  'tenant?: { profileName: string; orgName: string; }',
  'tenant?: { profileName: string; orgName: string; email?: string; }'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
