function friendlyClientError(error: { code?: string; message?: string }): string {
  if (error.code === "23505" && (error.message || "").includes("clients_organization_id_phone_normalized_key")) {
    return "Este número de WhatsApp já está cadastrado neste salão. Confira o número informado ou localize o cadastro existente.";
  }
  if (error.code === "23505") return "Já existe um cadastro com esses dados. Confira as informações e tente novamente.";
  return "Não foi possível salvar a cliente. Confira os dados e tente novamente.";
}

export async function createClientRecordService(supabase: any, client: { name: string; phone: string; notes?: string; birthDate?: string; cep?: string; street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string }) {
  if (!supabase) {
    return { success: false, error: "Supabase não conectado" };
  }

  const phoneNormalized = client.phone.replace(/\D/g, "");

  let text = client.notes || "";
  let anamnesisObj: any = null;
  try {
    if (client.notes && client.notes.startsWith("{")) {
      const parsed = JSON.parse(client.notes);
      text = parsed.text || "";
      anamnesisObj = parsed.anamnesis;
    }
  } catch(e) {}

  const { data: clientId, error } = await supabase.rpc('save_client_with_anamnesis', {
    p_client_id: null,
    p_name: client.name,
    p_phone: client.phone,
    p_phone_normalized: phoneNormalized,
    p_notes: text || null,
    p_birth_date: client.birthDate || null,
    p_cep: client.cep || null,
    p_street: client.street || null,
    p_number: client.number || null,
    p_complement: client.complement || null,
    p_neighborhood: client.neighborhood || null,
    p_city: client.city || null,
    p_state: client.state || null,
    p_has_anamnesis: Boolean(anamnesisObj),
    p_diabetes: Boolean(anamnesisObj?.diabetes),
    p_pregnant: Boolean(anamnesisObj?.gestante),
    p_nail_biting: Boolean(anamnesisObj?.roeUnha),
    p_allergies: anamnesisObj?.alergias || ""
  });

  if (error) {
    return { success: false, error: friendlyClientError(error) };
  }

  return { success: true, mode: "supabase", data: { id: clientId } };
}

export async function updateClientRecordService(supabase: any, id: string, client: { name: string; phone: string; notes?: string; birthDate?: string; cep?: string; street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string }) {
  if (!supabase) return { success: false, error: "Supabase não conectado" };
  const phoneNormalized = client.phone.replace(/\D/g, "");
  
  let text = client.notes || "";
  let anamnesisObj: any = null;
  try {
    if (client.notes && client.notes.startsWith("{")) {
      const parsed = JSON.parse(client.notes);
      text = parsed.text || "";
      anamnesisObj = parsed.anamnesis;
    }
  } catch(e) {}

  const { error } = await supabase.rpc('save_client_with_anamnesis', {
    p_client_id: id,
    p_name: client.name,
    p_phone: client.phone,
    p_phone_normalized: phoneNormalized,
    p_notes: text || null,
    p_birth_date: client.birthDate || null,
    p_cep: client.cep || null,
    p_street: client.street || null,
    p_number: client.number || null,
    p_complement: client.complement || null,
    p_neighborhood: client.neighborhood || null,
    p_city: client.city || null,
    p_state: client.state || null,
    p_has_anamnesis: Boolean(anamnesisObj),
    p_diabetes: Boolean(anamnesisObj?.diabetes),
    p_pregnant: Boolean(anamnesisObj?.gestante),
    p_nail_biting: Boolean(anamnesisObj?.roeUnha),
    p_allergies: anamnesisObj?.alergias || ""
  });

  if (error) {
    return { success: false, error: friendlyClientError(error) };
  }

  return { success: true };
}
