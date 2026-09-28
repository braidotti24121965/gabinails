const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

// 1. Import
code = code.replace(
  'import { Automations } from "./dashboard/automations";',
  'import { Automations } from "./dashboard/automations";\nimport { Reports } from "./dashboard/reports";'
);

// 2. nav
code = code.replace(
  '{ id: "automations", label: "Automações", icon: WandSparkles }, { id: "online", label: "Agendamento online", icon: ShoppingBag }',
  '{ id: "automations", label: "Automações", icon: WandSparkles }, { id: "reports", label: "Relatórios", icon: BarChart3 }, { id: "online", label: "Agendamento online", icon: ShoppingBag }'
);

// 3. titles
code = code.replace(
  'automations: ["Automações", "Comunicações programadas e receita recuperada."], online: ["Agendamento online", "Prévia do fluxo público para suas clientes."]',
  'automations: ["Automações", "Comunicações programadas e receita recuperada."], reports: ["Relatórios", "Desempenho, clientes e consumo."], online: ["Agendamento online", "Prévia do fluxo público para suas clientes."]'
);

// 4. Props
code = code.replace(
  'initialInventory = [], initialFinancials = [], initialStats = { revenue: 0, expenses: 0, commissions: 0, balance: 0 } }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[]; initialAppointments?: Appointment[]; initialServices?: any[]; initialInventory?: any[]; initialFinancials?: any[]; initialStats?: any }) {',
  'initialInventory = [], initialFinancials = [], initialStats = { revenue: 0, expenses: 0, commissions: 0, balance: 0 }, initialReports = {} }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[]; initialAppointments?: Appointment[]; initialServices?: any[]; initialInventory?: any[]; initialFinancials?: any[]; initialStats?: any; initialReports?: any }) {'
);

// 5. State
code = code.replace(
  'const [financialRows, setFinancialRows] = useState(() => [...initialFinancials]);',
  'const [financialRows, setFinancialRows] = useState(() => [...initialFinancials]);\nconst [reportsData] = useState(() => initialReports);'
);

// 6. View render
code = code.replace(
  'if (view === "automations") return <Automations data={automationRows} onNew={() => openEntity("automation", "create")} />;',
  'if (view === "automations") return <Automations data={automationRows} onNew={() => openEntity("automation", "create")} />;\n    if (view === "reports") return <Reports data={reportsData} />;'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
