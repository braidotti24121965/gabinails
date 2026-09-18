import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clientName,
      clientPhone,
      professionalId,
      date,
      time,
      durationMinutes = 60,
    } = body;

    if (!clientName || !clientPhone || !date || !time) {
      return NextResponse.json(
        { error: "Nome, telefone, data e horário são obrigatórios." },
        { status: 400 }
      );
    }

    const holdMinutes = 30;
    const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

    // Fallback gracioso caso Supabase ainda não esteja com credenciais ativas
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        holdId: `hold_${Date.now()}`,
        status: "held",
        holdExpiresAt: expiresAt.toISOString(),
        holdMinutes,
        message: `Horário reservado com sucesso por ${holdMinutes} minutos para confirmação do sinal.`,
        mode: "simulation",
      });
    }

    const supabase = await createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Erro ao conectar com banco" }, { status: 500 });
    }

    // Get default organization since it's a single-tenant app
    const { data: org } = await supabase.from("organizations").select("id").limit(1).single();
    if (!org) throw new Error("Organização não encontrada");

    let finalProfessionalId = professionalId;
    if (!finalProfessionalId) {
      const { data: prof } = await supabase.from("professionals").select("id").limit(1).single();
      if (!prof) throw new Error("Nenhum profissional cadastrado no sistema.");
      finalProfessionalId = prof.id;
    }
    
    const startsAt = new Date(`${date}T${time}:00`);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

    // 1. Encontra ou cria cliente
    const phoneNormalized = clientPhone.replace(/\D/g, "");
    let clientId: string | null = null;

    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("phone_normalized", phoneNormalized)
      .maybeSingle();

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: clientName,
          phone: clientPhone,
          phone_normalized: phoneNormalized,
          source: "online",
          organization_id: org.id,
        })
        .select("id")
        .single();

      if (clientError) {
        return NextResponse.json({ error: clientError.message }, { status: 500 });
      }
      clientId = newClient.id;
    }

    // 2. Insere agendamento em estado awaiting_deposit com hold_expires_at
    // Nota: O PostgreSQL disparará a exclusion constraint caso ocorra colisão
    const { data: appointment, error: appError } = await supabase
      .from("appointments")
      .insert({
        client_id: clientId,
        professional_id: finalProfessionalId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: "awaiting_deposit",
        hold_expires_at: expiresAt.toISOString(),
        source: "online",
        organization_id: org.id,
      })
      .select()
      .single();

    if (appError) {
      if (appError.message.includes("appointments_no_overlap")) {
        return NextResponse.json(
          { error: "Este horário acabou de ser reservado por outra cliente. Por favor, escolha outro slot." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: appError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      appointmentId: appointment.id,
      holdExpiresAt: expiresAt.toISOString(),
      holdMinutes,
      message: `Horário reservado com sucesso por ${holdMinutes} minutos para confirmação do sinal.`,
      mode: "supabase",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
