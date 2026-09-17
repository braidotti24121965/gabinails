const fs = require('fs');
let actionsCode = fs.readFileSync('src/lib/actions/appointments.ts', 'utf8');

// Update addServiceToAppointment to return the inserted ID
actionsCode = actionsCode.replace(
  'const { error } = await supabase.from("appointment_items").insert([{',
  'const { data, error } = await supabase.from("appointment_items").insert([{'
);
actionsCode = actionsCode.replace(
  'commission_value: 0\n  }]);',
  'commission_value: 0\n  }]).select("id").single();'
);
actionsCode = actionsCode.replace(
  'if (error) return { success: false, error: error.message };\n  revalidatePath("/");\n  return { success: true };',
  'if (error) return { success: false, error: error.message };\n  revalidatePath("/");\n  return { success: true, id: data?.id };'
);
fs.writeFileSync('src/lib/actions/appointments.ts', actionsCode);


// Update UI to use the returned ID and remove window.location.reload()
let uiCode = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');
const oldRender = `const newItems = [...(activeAppointment.items || []), { id: tempId, name: svc.name, price: svc.price }];
            
            setRows(current => current.map(item => item.id === activeAppointment.id ? { ...item, price: newPrice, service: newService, items: newItems } : item));
            setActiveAppointment({ ...activeAppointment, price: newPrice, service: newService, items: newItems });
            
            await addServiceToAppointment(activeAppointment.id, profId, svc.id, svc.price, svc.duration);
            // Refresh to get real IDs
            window.location.reload();`;

const newRender = `const newItems = [...(activeAppointment.items || []), { id: tempId, name: svc.name, price: svc.price }];
            
            setRows(current => current.map(item => item.id === activeAppointment.id ? { ...item, price: newPrice, service: newService, items: newItems } : item));
            setActiveAppointment({ ...activeAppointment, price: newPrice, service: newService, items: newItems });
            
            const res = await addServiceToAppointment(activeAppointment.id, profId, svc.id, svc.price, svc.duration);
            if (res.success && res.id) {
              // Update with real ID so they can remove it
              const finalItems = newItems.map(i => i.id === tempId ? { ...i, id: res.id } : i);
              setRows(current => current.map(item => item.id === activeAppointment.id ? { ...item, items: finalItems } : item));
              setActiveAppointment(curr => curr ? { ...curr, items: finalItems } : null);
            }`;

uiCode = uiCode.replace(oldRender, newRender);
fs.writeFileSync('src/components/nail-studio-app.tsx', uiCode);
