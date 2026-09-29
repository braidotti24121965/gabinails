const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

const userFetch = `    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
    }`;

const newFetch = `    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
    }
    
    // Fetch tenant profile and organization
    const { data: profile } = await supabase.from('profiles').select('full_name, organization_id').eq('id', user.id).single();
    let organization = { name: "Nail Studio" };
    if (profile?.organization_id) {
      const { data: org } = await supabase.from('organizations').select('name').eq('id', profile.organization_id).single();
      if (org) organization = org;
    }
    
    // Pass to component (we will add to props)
    var tenantContext = { profileName: profile?.full_name || "Usuário", orgName: organization.name };
`;

code = code.replace(userFetch, newFetch);

const appReturn = `  return <NailStudioApp 
    initialClients={clients} 
    initialProfessionals={professionals} 
    initialSpecialties={specialties}
    initialAppointments={appointments}
    initialServices={services}
    initialFinancials={financialData.data}
    initialStats={financialData.stats}
    initialInventory={inventory}
    initialReports={reports}
  />;`;

const newAppReturn = `  return <NailStudioApp 
    initialClients={clients} 
    initialProfessionals={professionals} 
    initialSpecialties={specialties}
    initialAppointments={appointments}
    initialServices={services}
    initialFinancials={financialData.data}
    initialStats={financialData.stats}
    initialInventory={inventory}
    initialReports={reports}
    tenant={tenantContext}
  />;`;

code = code.replace(appReturn, newAppReturn);
fs.writeFileSync('src/app/page.tsx', code);
