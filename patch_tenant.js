const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

const oldSig = 'export function NailStudioApp({ initialClients = demoClients, initialProfessionals = demoProfessionals, initialSpecialties = [], initialAppointments = [], initialInventory = [], initialServices = demoServices as any[], initialFinancials = [], initialStats = { revenue: 0, expenses: 0, commissions: 0, balance: 0 }, initialReports = {} }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[]; initialAppointments?: Appointment[]; initialServices?: any[]; initialInventory?: any[]; initialFinancials?: any[]; initialStats?: any; initialReports?: any }) {';

const newSig = 'export function NailStudioApp({ tenant = { profileName: "Gabi", orgName: "Gabi Ludwig Nail Studio" }, initialClients = demoClients, initialProfessionals = demoProfessionals, initialSpecialties = [], initialAppointments = [], initialInventory = [], initialServices = demoServices as any[], initialFinancials = [], initialStats = { revenue: 0, expenses: 0, commissions: 0, balance: 0 }, initialReports = {} }: { tenant?: { profileName: string; orgName: string; }; initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[]; initialAppointments?: Appointment[]; initialServices?: any[]; initialInventory?: any[]; initialFinancials?: any[]; initialStats?: any; initialReports?: any }) {';

code = code.replace(oldSig, newSig);

// Replace static "Gabi Ludwig" with tenant.orgName and tenant.profileName
code = code.replace(
  '<h2 className="mt-4 font-bold text-white">Gabi Ludwig</h2>',
  '<h2 className="mt-4 font-bold text-white">{tenant.orgName}</h2>'
);

// Sidebar Name
code = code.replace(
  '<p className="text-xs font-medium text-muted">Nail Studio</p>',
  '<p className="text-xs font-medium text-muted line-clamp-1">{tenant.orgName}</p>'
);

// Top right profile
code = code.replace(
  '<p className="text-sm font-semibold text-ink">Gabi Ludwig</p>',
  '<p className="text-sm font-semibold text-ink">{tenant.profileName}</p>'
);
code = code.replace(
  '<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-bold text-white shadow-inner">GL</div>',
  '<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-bold text-white shadow-inner">{tenant.profileName.substring(0,2).toUpperCase()}</div>'
);

// Dashboard Greeting
code = code.replace(
  '<h2 className="text-xl font-bold">Bom dia, Gabi</h2>',
  '<h2 className="text-xl font-bold">Bom dia, {tenant.profileName.split(" ")[0]}</h2>'
);

// Another place in Sidebar maybe?
// Let's also check if "Gabi Ludwig" appears elsewhere in NailStudioApp.
// Gabi Ludwig in BookingModal might be from professionals, which is fine since professionals table has real names.

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
