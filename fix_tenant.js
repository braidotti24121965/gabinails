const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

// 1. Update Header signature
code = code.replace(
  'function Header({ view, onMenu }: { view: View; onMenu: () => void }) {',
  'function Header({ view, onMenu, tenant }: { view: View; onMenu: () => void; tenant: any }) {'
);
code = code.replace(
  '<p className="text-xs font-medium">Gabi Ludwig</p>',
  '<p className="text-xs font-medium line-clamp-1">{tenant.profileName}</p>'
);
code = code.replace(
  '<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">GL</div>',
  '<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">{tenant.profileName.substring(0,2).toUpperCase()}</div>'
);

// 2. Update Sidebar signature
code = code.replace(
  'function Sidebar({ view, setView, open, close }: { view: View; setView: (v: View) => void; open: boolean; close: () => void }) {',
  'function Sidebar({ view, setView, open, close, tenant }: { view: View; setView: (v: View) => void; open: boolean; close: () => void; tenant: any }) {'
);
code = code.replace(
  '<span className="block text-sm font-semibold">Gabi Ludwig</span>',
  '<span className="block text-sm font-semibold line-clamp-1">{tenant.profileName}</span>'
);
code = code.replace(
  '<span className="block text-[10px] text-white/55">Nail Studio</span>',
  '<span className="block text-[10px] text-white/55 line-clamp-1">{tenant.orgName}</span>'
);

// 3. Update Dashboard signature
code = code.replace(
  'function Dashboard({ go, stats, onAttendance, appointments = [], clients = [] }: { go: (v: View) => void, stats?: any, onAttendance?: (a: Appointment) => void, appointments?: Appointment[], clients?: any[] }) {',
  'function Dashboard({ go, stats, onAttendance, appointments = [], clients = [], tenant }: { go: (v: View) => void, stats?: any, onAttendance?: (a: Appointment) => void, appointments?: Appointment[], clients?: any[], tenant: any }) {'
);
code = code.replace(
  '<h2 className="text-xl font-bold">Bom dia, Gabi</h2>',
  '<h2 className="text-xl font-bold">Bom dia, {tenant.profileName.split(" ")[0]}</h2>'
);

// Now update invocations inside NailStudioApp
code = code.replace(
  '<Header view={view} onMenu={() => setMenu(true)} />',
  '<Header view={view} onMenu={() => setMenu(true)} tenant={tenant} />'
);
code = code.replace(
  '<Sidebar view={view} setView={setView} open={menu} close={() => setMenu(false)} />',
  '<Sidebar view={view} setView={setView} open={menu} close={() => setMenu(false)} tenant={tenant} />'
);
code = code.replace(
  '<Dashboard go={setView} stats={initialStats} onAttendance={a => { setActiveAppointment(a); setFinish(true); }} appointments={rows} clients={clientRows} />',
  '<Dashboard go={setView} stats={initialStats} onAttendance={a => { setActiveAppointment(a); setFinish(true); }} appointments={rows} clients={clientRows} tenant={tenant} />'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
