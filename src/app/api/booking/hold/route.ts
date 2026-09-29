import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { findAvailableProfessionalForSlot } from "@/lib/availability-engine";
import { getOrgBySlug } from "@/lib/services/public-booking.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      slug = "gabi-ludwig",
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

    // Resolve organization exclusively on the server by slug
    const org = await getOrgBySlug(supabase, slug);
    if (!org) {
      return NextResponse.json({ error: "Salão não encontrado ou inativo." }, { status: 404 });
    }

    let finalProfessionalId = professionalId;
    const phoneNormalized = clientPhone.replace(/\D/g, "");
    
    if (!finalProfessionalId) {
      if (professionalName) {
        const { data: profs } = await supabase
          .from("professionals")
          .select("id")
          .eq("organization_id", org.id)
          .ilike("name", professionalName)
          .limit(1);
        if (profs && profs.length > 0) finalProfessionalId = profs[0].id;
      }
      
      if (!finalProfessionalId || finalProfessionalId === "any") {
        const { data: existingClient } = await supabase
          .from("clients")
          .select("preferred_professional_id")
          .eq("organization_id", org.id)
          .eq("phone_normalized", phoneNormalized)
          .maybeSingle();
        const preferredProfessionalId = existingClient?.preferred_professional_id;
        
        const freeProf = await findAvailableProfessionalForSlot({
          orgId: org.id,
          date,
          time,
          serviceDuration: durationMinutes,
          serviceId,
          preferredProfessionalId
        });
        if (!freeProf) throw new Error("Infelizmente esse horário acabou de ser ocupado. Por favor, escolha outro.");
        finalProfessionalId = freeProf;
      }
    }
    
    const startsAt = new Date(`${date}T${time}:00-03:00`);

    // Expira holds vencidos para a organização
    await supabase.from("appointments")
      .update({ status: 'cancelled', notes: 'Expirado automaticamente após 30 minutos sem confirmação de sinal.' })
      .eq("organization_id", org.id)
      .eq("status", "awaiting_deposit")
      .lt("hold_expires_at", new Date().toISOString());

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
