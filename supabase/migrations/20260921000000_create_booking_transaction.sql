-- Function to handle booking transaction atomically
create or replace function create_booking_transaction(
  p_org_id uuid,
  p_client_name text,
  p_client_phone text,
  p_client_phone_normalized text,
  p_professional_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_hold_minutes int
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_client_id uuid;
  v_appointment_id uuid;
  v_service record;
  v_professional record;
  v_ends_at timestamptz;
  v_expires_at timestamptz;
begin
  -- 1. Validate service
  select * into v_service from public.services where id = p_service_id and organization_id = p_org_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Serviço não encontrado no sistema.');
  end if;
  if not v_service.active then
    return jsonb_build_object('success', false, 'error', 'Este serviço está inativo no momento.');
  end if;

  -- 2. Validate professional
  select * into v_professional from public.professionals where id = p_professional_id and organization_id = p_org_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Profissional não encontrada.');
  end if;
  if not v_professional.active then
    return jsonb_build_object('success', false, 'error', 'Esta profissional está inativa no momento.');
  end if;

  -- 3. Find or create client
  select id into v_client_id from public.clients where phone_normalized = p_client_phone_normalized and organization_id = p_org_id limit 1;
  if not found then
    insert into public.clients (organization_id, name, phone, phone_normalized, source)
    values (p_org_id, p_client_name, p_client_phone, p_client_phone_normalized, 'online')
    returning id into v_client_id;
  end if;

  -- 4. Calculate dates
  v_ends_at := p_starts_at + (v_service.duration_minutes || ' minutes')::interval;
  v_expires_at := now() + (p_hold_minutes || ' minutes')::interval;

  -- 5. Insert appointment
  begin
    insert into public.appointments (
      organization_id,
      client_id,
      professional_id,
      starts_at,
      ends_at,
      status,
      hold_expires_at,
      source
    ) values (
      p_org_id,
      v_client_id,
      p_professional_id,
      p_starts_at,
      v_ends_at,
      'awaiting_deposit',
      v_expires_at,
      'online'
    ) returning id into v_appointment_id;
  exception when exclusion_violation then
    return jsonb_build_object('success', false, 'error', 'Este horário acabou de ser reservado por outra cliente. Por favor, escolha outro slot.');
  end;

  -- 6. Insert appointment item (Snapshot of real price and duration)
  insert into public.appointment_items (
    organization_id,
    appointment_id,
    service_id,
    professional_id,
    description,
    duration_minutes,
    unit_price,
    quantity,
    discount,
    commission_type,
    commission_value
  ) values (
    p_org_id,
    v_appointment_id,
    v_service.id,
    p_professional_id,
    v_service.name,
    v_service.duration_minutes,
    v_service.price,
    1,
    0,
    'percentage',
    v_professional.default_commission
  );

  return jsonb_build_object(
    'success', true, 
    'appointment_id', v_appointment_id,
    'hold_expires_at', v_expires_at
  );
end;
$$;

-- Secure the function
revoke execute on function create_booking_transaction from public;
grant execute on function create_booking_transaction to authenticated, service_role;
