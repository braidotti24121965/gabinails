-- Migration: 202609290004_anamnesis_and_negative_payment.sql
-- Description: Add save_client_with_anamnesis RPC and update finish_appointment_checkout_full to reject negative payment amounts.

-- 1. Create or Replace save_client_with_anamnesis RPC
CREATE OR REPLACE FUNCTION public.save_client_with_anamnesis(
    p_client_id UUID DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_phone_normalized TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_birth_date DATE DEFAULT NULL,
    p_cep TEXT DEFAULT NULL,
    p_street TEXT DEFAULT NULL,
    p_number TEXT DEFAULT NULL,
    p_complement TEXT DEFAULT NULL,
    p_neighborhood TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_state TEXT DEFAULT NULL,
    p_has_anamnesis BOOLEAN DEFAULT FALSE,
    p_diabetes BOOLEAN DEFAULT FALSE,
    p_pregnant BOOLEAN DEFAULT FALSE,
    p_nail_biting BOOLEAN DEFAULT FALSE,
    p_allergies TEXT DEFAULT NULL
) RETURNS UUID
SET search_path = ''
AS $$
DECLARE
    v_org_id UUID;
    v_target_id UUID;
BEGIN
    v_org_id := private.current_organization_id();
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated or no organization';
    END IF;

    IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
        RAISE EXCEPTION 'Name cannot be empty';
    END IF;

    IF p_client_id IS NULL THEN
        -- Insert new client
        INSERT INTO public.clients (
            organization_id, name, phone, phone_normalized, notes, birth_date,
            cep, street, number, complement, neighborhood, city, state, status
        ) VALUES (
            v_org_id, trim(p_name), p_phone, p_phone_normalized, p_notes, p_birth_date,
            p_cep, p_street, p_number, p_complement, p_neighborhood, p_city, p_state, 'active'
        ) RETURNING id INTO v_target_id;
    ELSE
        -- Verify client belongs to org
        IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id AND organization_id = v_org_id) THEN
            RAISE EXCEPTION 'Client not found or access denied';
        END IF;

        UPDATE public.clients SET
            name = trim(p_name),
            phone = p_phone,
            phone_normalized = p_phone_normalized,
            notes = p_notes,
            birth_date = p_birth_date,
            cep = p_cep,
            street = p_street,
            number = p_number,
            complement = p_complement,
            neighborhood = p_neighborhood,
            city = p_city,
            state = p_state,
            updated_at = now()
        WHERE id = p_client_id AND organization_id = v_org_id;

        v_target_id := p_client_id;
    END IF;

    -- Atomic Anamnesis Save/Upsert: ONLY execute if p_has_anamnesis is TRUE
    IF p_has_anamnesis THEN
        INSERT INTO public.client_anamnesis (
            organization_id, client_id, diabetes, pregnant, nail_biting, allergies, notes, updated_at
        ) VALUES (
            v_org_id, v_target_id, COALESCE(p_diabetes, false), COALESCE(p_pregnant, false),
            COALESCE(p_nail_biting, false), COALESCE(p_allergies, ''), '', now()
        )
        ON CONFLICT (client_id) DO UPDATE SET
            diabetes = EXCLUDED.diabetes,
            pregnant = EXCLUDED.pregnant,
            nail_biting = EXCLUDED.nail_biting,
            allergies = EXCLUDED.allergies,
            updated_at = now();
    END IF;

    RETURN v_target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.save_client_with_anamnesis(UUID, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_client_with_anamnesis(UUID, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT) TO authenticated;

-- 2. Update finish_appointment_checkout_full to reject negative payment amounts
CREATE OR REPLACE FUNCTION public.finish_appointment_checkout_full(
    p_appointment_id UUID,
    p_payment_amount NUMERIC,
    p_payment_method TEXT,
    p_package_id UUID DEFAULT NULL,
    p_commissions JSONB DEFAULT '[]'::jsonb,
    p_inventory_deductions JSONB DEFAULT '[]'::jsonb
) RETURNS VOID
SET search_path = ''
AS $$
DECLARE
    v_org_id UUID;
    v_client_id UUID;
    v_status TEXT;
    v_method TEXT;
    v_comm record;
    v_inv record;
BEGIN
    v_org_id := private.current_organization_id();
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated or no organization';
    END IF;

    -- Lock appointment to prevent race conditions & duplicate checkout
    SELECT client_id, status INTO v_client_id, v_status
    FROM public.appointments
    WHERE id = p_appointment_id AND organization_id = v_org_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found or access denied';
    END IF;

    IF v_status = 'completed' THEN
        RAISE EXCEPTION 'Appointment is already completed';
    END IF;

    IF p_payment_amount IS NOT NULL AND p_payment_amount < 0 THEN
        RAISE EXCEPTION 'Payment amount cannot be negative';
    END IF;

    v_method := lower(p_payment_method);
    IF v_method NOT IN ('pix', 'cash', 'debit', 'credit', 'other') THEN
        v_method := 'other';
    END IF;

    -- Package consumption
    IF p_package_id IS NOT NULL THEN
        -- Validate package
        IF NOT EXISTS (
            SELECT 1 FROM public.packages
            WHERE id = p_package_id
              AND organization_id = v_org_id
              AND client_id = v_client_id
              AND status = 'active'
              AND remaining_sessions > 0
              AND (expires_at IS NULL OR expires_at > now())
            FOR UPDATE
        ) THEN
            RAISE EXCEPTION 'Package is invalid, expired, exhausted, or belongs to another client/org';
        END IF;

        UPDATE public.packages
        SET remaining_sessions = remaining_sessions - 1,
            status = CASE WHEN remaining_sessions - 1 = 0 THEN 'completed' ELSE 'active' END,
            updated_at = now()
        WHERE id = p_package_id AND organization_id = v_org_id;

        INSERT INTO public.package_sessions (organization_id, package_id, appointment_id, status)
        VALUES (v_org_id, p_package_id, p_appointment_id, 'used');
    ELSIF p_payment_amount > 0 THEN
        -- Only insert payment when no package is used
        INSERT INTO public.payments (organization_id, appointment_id, client_id, amount, method, status, kind, paid_at)
        VALUES (v_org_id, p_appointment_id, v_client_id, p_payment_amount, v_method, 'paid', 'payment', now());
    END IF;

    -- Commissions
    IF p_commissions IS NOT NULL AND jsonb_array_length(p_commissions) > 0 THEN
        FOR v_comm IN SELECT * FROM jsonb_to_recordset(p_commissions) AS x(appointment_item_id UUID, professional_id UUID, amount NUMERIC) LOOP
            IF NOT EXISTS (
                SELECT 1 FROM public.appointment_items
                WHERE id = v_comm.appointment_item_id AND appointment_id = p_appointment_id
            ) THEN
                RAISE EXCEPTION 'Appointment item % does not belong to appointment %', v_comm.appointment_item_id, p_appointment_id;
            END IF;

            IF v_comm.professional_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM public.professionals
                WHERE id = v_comm.professional_id AND organization_id = v_org_id
            ) THEN
                RAISE EXCEPTION 'Professional % does not belong to organization', v_comm.professional_id;
            END IF;

            INSERT INTO public.commissions (organization_id, appointment_item_id, professional_id, amount, status)
            VALUES (v_org_id, v_comm.appointment_item_id, v_comm.professional_id, COALESCE(v_comm.amount, 0), 'generated');
        END LOOP;
    END IF;

    -- Inventory Deductions (using real schema columns)
    IF p_inventory_deductions IS NOT NULL AND jsonb_array_length(p_inventory_deductions) > 0 THEN
        FOR v_inv IN SELECT * FROM jsonb_to_recordset(p_inventory_deductions) AS x(product_id UUID, quantity NUMERIC, appointment_item_id UUID) LOOP
            IF NOT EXISTS (
                SELECT 1 FROM public.products
                WHERE id = v_inv.product_id AND organization_id = v_org_id
            ) THEN
                RAISE EXCEPTION 'Product % does not belong to organization', v_inv.product_id;
            END IF;

            IF v_inv.appointment_item_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM public.appointment_items
                WHERE id = v_inv.appointment_item_id AND appointment_id = p_appointment_id
            ) THEN
                RAISE EXCEPTION 'Appointment item % does not belong to appointment %', v_inv.appointment_item_id, p_appointment_id;
            END IF;

            INSERT INTO public.stock_movements (organization_id, product_id, movement_type, quantity, source, appointment_item_id)
            VALUES (v_org_id, v_inv.product_id, 'consumption', v_inv.quantity, 'appointment_conclusion', v_inv.appointment_item_id);
        END LOOP;
    END IF;

    -- Mark Appointment Completed
    UPDATE public.appointments
    SET status = 'completed', actual_end_at = now()
    WHERE id = p_appointment_id AND organization_id = v_org_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.finish_appointment_checkout_full(UUID, NUMERIC, TEXT, UUID, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finish_appointment_checkout_full(UUID, NUMERIC, TEXT, UUID, JSONB, JSONB) TO authenticated;
