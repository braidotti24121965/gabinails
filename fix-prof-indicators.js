const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/professionals.ts', 'utf8');

code = code.replace(
  '    .eq("active", true)\n    .order("name", { ascending: true });',
  `    .eq("active", true)
    .order("name", { ascending: true });
    
  // Fetch pending commissions for each professional
  const { data: comms } = await supabase.from('commissions').select('professional_id, amount').eq('status', 'generated');`
);

code = code.replace(
  '      // Indicators (mocked for now until we have real financial queries)\n      today: 0,\n      production: 0,\n      occupation: 0,\n      commission: 0,',
  `      // Indicators
      today: 0, // Pending implement
      production: 0, // Pending implement
      occupation: 0, // Pending implement
      commission: comms ? comms.filter(c => c.professional_id === item.id).reduce((acc, c) => acc + Number(c.amount), 0) : 0,`
);

fs.writeFileSync('src/lib/actions/professionals.ts', code);
