import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { findAvailableProfessionalForSlot } from "@/lib/availability-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clientName,
      clientPhone,
      professionalId,
      professionalName,
      date,
      time,
      durationMinutes = 60,
      serviceId,
      serviceName,
      servicePrice,
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
      if (professionalName) {
        // Try to find the professional by name
        const { data: profs } = await supabase.from("professionals").select("id").ilike("name", professionalName).limit(1);
        if (profs && profs.length > 0) finalProfessionalId = profs[0].id;
      }
      
      if (!finalProfessionalId || finalProfessionalId === "any") {
        // Encontra quem realmente está livre nesse horário pelo Motor Único!
        const freeProf = await findAvailableProfessionalForSlot({ date, time, serviceDuration: durationMinutes, serviceId });
        if (!freeProf) throw new Error("Infelizmente esse horário acabou de ser ocupado. Por favor, escolha outro.");
        finalProfessionalId = freeProf;
      }
    }
    
    const startsAt = new Date(`${date}T${time}:00-03:00`);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

    // 0. Expira holds vencidos para liberar a agenda (idempotente)
    await supabase.from("appointments").update({ status: 'cancelled', notes: 'Expirado automaticamente após 30 minutos sem confirmação de sinal.' }).eq("status", "awaiting_deposit").lt("hold_expires_at", new Date().toISOString());

    // --- TRANSAÇÃO ATÔMICA SEGURA ---
    // Executa todo o processo no banco usando a RPC. Ignora os dados de preço/duração enviados pelo navegador.
    const phoneNormalized = clientPhone.replace(/\D/g, "");
    
    // Não bloqueamos mais quem não está na whitelist.
    // Apenas aguardamos o pagamento do sinal de 50%.
    


    const { data: result, error: rpcError } = await supabase.rpc('create_booking_transaction', {
      p_org_id: org.id,
      p_client_name: clientName,
      p_client_phone: clientPhone,
      p_client_phone_normalized: phoneNormalized,
      p_professional_id: finalProfessionalId,
      p_service_id: serviceId,
      p_starts_at: startsAt.toISOString(),
      p_hold_minutes: holdMinutes
    });

    if (rpcError) {
      console.error("RPC Error:", rpcError);
      return NextResponse.json({ error: "Erro interno ao processar reserva." }, { status: 500 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      appointmentId: result.appointment_id,
      holdExpiresAt: result.hold_expires_at,
      holdMinutes,
      message: `Horário reservado com sucesso por ${holdMinutes} minutos para confirmação do sinal.`,
      mode: "supabase",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
