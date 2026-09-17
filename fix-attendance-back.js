const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add 'Voltar' button inside Attendance detail view
const oldAttendanceTop = `function Attendance({ appointment, onFinish, onSelect, allAppointments = [] }: { appointment: Appointment | null; onFinish: () => void; onSelect: (a: Appointment | null) => void; allAppointments: Appointment[] }) { 
    const [extra, setExtra] = useState(false); 
    if (!appointment) {`;

const oldDetailTop = `  return (
    <main className="page-content">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge tone={appointment.status === "Em atendimento" ? "green" : "blue"}>{appointment.status}</Badge>`;

const newDetailTop = `  return (
    <main className="page-content">
      <button onClick={() => onSelect(null)} className="mb-4 text-sm font-medium text-muted hover:text-primary flex items-center gap-1">← Voltar para a lista</button>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge tone={appointment.status === "Em atendimento" ? "green" : "blue"}>{appointment.status}</Badge>`;

// Wait, the signature of onSelect must allow null.
content = content.replace(
  'onSelect: (a: Appointment) => void;',
  'onSelect: (a: Appointment | null) => void;'
);

content = content.replace(oldDetailTop, newDetailTop);

// 2. Clear activeAppointment when clicking the Sidebar 'Atendimentos' tab
const oldSidebarNav = `const nav = [
    { id: "dashboard", label: "Painel", icon: Home },
    { id: "agenda", label: "Agenda", icon: CalendarDays },
    { id: "clients", label: "Clientes", icon: HeartHandshake },
    { id: "services", label: "Serviços", icon: Gift },
    { id: "professionals", label: "Profissionais", icon: User },
    { id: "attendance", label: "Atendimentos", icon: ClipboardCheck },
  ];`;

// But wait, the click handler is what matters.
const oldSidebarClick = `onClick={() => setView(item.id as any)}`;
const newSidebarClick = `onClick={() => {
              setView(item.id as any);
              if (item.id === "attendance") setActiveAppointment(null);
            }}`;

content = content.replace(oldSidebarClick, newSidebarClick);

fs.writeFileSync(path, content);
