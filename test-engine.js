const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, val] = line.split('=');
  if (key && val) env[key.trim()] = val.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const date = "2026-09-23";
  const serviceDuration = 180;
  
  const { data: profs } = await supabase.from('professionals').select('id').eq('active', true);
  const eligibleProfIds = profs.map(p => p.id);
  
  const startOfDaySP = `${date}T00:00:00-03:00`;
  const endOfDaySP = `${date}T23:59:59-03:00`;

  const { data: appointments } = await supabase
    .from("appointments")
    .select("professional_id, starts_at, ends_at")
    .in("professional_id", eligibleProfIds)
    .gte("starts_at", new Date(startOfDaySP).toISOString())
    .lte("starts_at", new Date(endOfDaySP).toISOString());

  console.log("Eligible Profs:", eligibleProfIds);
  console.log("Appointments:", appointments);

  const availableSlots = [];
  const dayStartMinutes = 8 * 60;
  const dayEndMinutes = 19 * 60;

  for (let minOffset = dayStartMinutes; minOffset + serviceDuration <= dayEndMinutes; minOffset += 15) {
    const hour = Math.floor(minOffset / 60);
    const min = minOffset % 60;
    const timeString = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    
    const slotStartIso = new Date(`${date}T${timeString}:00-03:00`).getTime();
    const slotEndIso = slotStartIso + serviceDuration * 60 * 1000;

    let slotAvailable = false;
    for (const pId of eligibleProfIds) {
      const profAppointments = appointments.filter(a => a.professional_id === pId);
      
      const hasConflict = profAppointments.some(app => {
        const appStart = new Date(app.starts_at).getTime();
        const appEnd = new Date(app.ends_at).getTime();
        return Math.max(slotStartIso, appStart) < Math.min(slotEndIso, appEnd);
      });

      if (!hasConflict) {
        slotAvailable = true;
        break; 
      }
    }

    if (slotAvailable) {
      availableSlots.push(timeString);
    }
  }

  console.log("Available:", availableSlots);
}
run();
