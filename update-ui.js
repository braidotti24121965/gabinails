const fs = require('fs');

const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update NailStudioApp props
content = content.replace(
  'export function NailStudioApp({ initialClients = demoClients, initialProfessionals = demoProfessionals }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[] }) {',
  'export function NailStudioApp({ initialClients = demoClients, initialProfessionals = demoProfessionals, initialSpecialties = [] }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[] }) {'
);

// Add specialties state
content = content.replace(
  'const [automationRows, setAutomationRows] = useState(() => [...initialTemplates]);',
  'const [automationRows, setAutomationRows] = useState(() => [...initialTemplates]); const [specialtyList, setSpecialtyList] = useState(() => [...initialSpecialties]);'
);

// Pass specialties to ProfessionalModal
content = content.replace(
  '{entityModal.kind === "professional" ? (',
  '{entityModal.kind === "professional" ? ('
);

content = content.replace(
  '<ProfessionalModal mode={entityModal.mode} professional={professionalRows[entityModal.index || 0]} close={() => setEntityModal(null)} save={saveProfessional} />',
  '<ProfessionalModal mode={entityModal.mode} professional={professionalRows[entityModal.index || 0]} specialtiesList={specialtyList} close={() => setEntityModal(null)} save={saveProfessional} />'
);

content = content.replace(
  '<ProfessionalModal mode={entityModal.mode} close={() => setEntityModal(null)} save={saveProfessional} />',
  '<ProfessionalModal mode={entityModal.mode} specialtiesList={specialtyList} close={() => setEntityModal(null)} save={saveProfessional} />'
);

// Update ProfessionalModal signature
content = content.replace(
  'function ProfessionalModal({ mode, professional, close, save }: { mode: "create" | "view" | "edit"; professional?: ProfessionalItem; close: () => void; save: (data: any) => void }) {',
  'function ProfessionalModal({ mode, professional, specialtiesList = [], close, save }: { mode: "create" | "view" | "edit"; professional?: ProfessionalItem; specialtiesList?: {id: string, name: string}[]; close: () => void; save: (data: any) => void }) {'
);

// Change specialty state to array
content = content.replace(
  'specialty: professional?.specialty || "",',
  'specialties: professional?.specialty ? professional.specialty.split(",").map(s=>s.trim()).filter(Boolean) : [],'
);

// Replace input with pill selector
content = content.replace(
  '<label className="field-label">Especialidades (separadas por vírgula)</label>\n            <input className="field-input" value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value })} disabled={readOnly} placeholder="Gel, Fibra, etc." />',
  `<label className="field-label mb-2">Especialidades</label>
            <div className="flex flex-wrap gap-2">
              {specialtiesList.map(s => {
                const active = formData.specialties.includes(s.name);
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={readOnly}
                    onClick={() => {
                      if (active) setFormData({ ...formData, specialties: formData.specialties.filter(x => x !== s.name) });
                      else setFormData({ ...formData, specialties: [...formData.specialties, s.name] });
                    }}
                    className={\`rounded-full border px-3 py-1.5 text-xs transition \${active ? "border-primary bg-primary text-white" : "border-[#DBE3EC] bg-white text-ink hover:border-primary/50"}\`}
                  >
                    {s.name}
                  </button>
                );
              })}
              {specialtiesList.length === 0 && <span className="text-xs text-muted">Nenhuma especialidade cadastrada.</span>}
            </div>`
);

// Update save logic
content = content.replace(
  'const specialties = formData.specialty.split(",").map((s: string) => s.trim()).filter(Boolean);\n    const dataToSave = { ...formData, specialties };',
  'const dataToSave = { ...formData, specialty: formData.specialties.join(", "), specialties: formData.specialties };'
);

fs.writeFileSync(path, content);
console.log("Updated ProfessionalModal successfully");
