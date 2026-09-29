-- Fix sell_package security and schema. Replace the legacy seven-argument
-- version instead of leaving an overload that makes permission statements
-- and RPC resolution ambiguous.
DROP FUNCTION IF EXISTS public.sell_package(UUID, TEXT, INTEGER, NUMERIC, TEXT, TIMESTAMPTZ, UUID);
CREATE OR REPLACE FUNCTION public.sell_package(
    p_client_id UUID,
    p_name TEXT,
    p_total_sessions INT,
    p_price NUMERIC,
    p_payment_method TEXT,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS UUID
SET search_path = ''
AS $$
DECLARE
    v_package_id UUID;
    v_org_id UUID;
    v_method TEXT;
BEGIN
    v_org_id := private.current_organization_id();
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated or no organization';
    END IF;

    IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
        RAISE EXCEPTION 'Name cannot be empty';
    END IF;
    IF p_price <= 0 THEN
        RAISE EXCEPTION 'Price must be greater than zero';
    END IF;
    IF p_total_sessions <= 0 THEN
        RAISE EXCEPTION 'Total sessions must be greater than zero';
    END IF;

    -- VALIDATION: Ensure client belongs to the organization
    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id AND organization_id = v_org_id) THEN
        RAISE EXCEPTION 'Client does not belong to your organization';
    END IF;

    v_method := lower(p_payment_method);
    IF v_method NOT IN ('pix', 'cash', 'debit', 'credit', 'other') THEN
        v_method := 'other';
    END IF;

    INSERT INTO public.packages (organization_id, client_id, name, total_sessions, remaining_sessions, price, status, expires_at)
    VALUES (v_org_id, p_client_id, p_name, p_total_sessions, p_total_sessions, p_price, 'active', p_expires_at)
    RETURNING id INTO v_package_id;

    INSERT INTO public.payments (organization_id, client_id, amount, method, status, kind, paid_at)
    VALUES (v_org_id, p_client_id, p_price, v_method, 'paid', 'payment', now());

    RETURN v_package_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.sell_package(UUID, TEXT, INTEGER, NUMERIC, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sell_package(UUID, TEXT, INTEGER, NUMERIC, TEXT, TIMESTAMPTZ) TO authenticated;

-- Fully atomic checkout including commissions and inventory
CREATE OR REPLACE FUNCTION public.finish_appointment_checkout_full(
    p_appointment_id UUID,
    p_payment_amount NUMERIC,
    p_payment_method TEXT,
    p_package_id UUID,
    p_commissions JSONB,
    p_inventory_deductions JSONB
) RETURNS VOID
SET search_path = ''
AS $$
DECLARE
    v_org_id UUID;
    v_client_id UUID;
    v_method TEXT;
    v_comm record;
    v_inv record;
    v_status TEXT;
BEGIN
    v_org_id := private.current_organization_id();
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated or no organization';
    END IF;

    SELECT client_id, status INTO v_client_id, v_status FROM public.appointments WHERE id = p_appointment_id AND organization_id = v_org_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found';
    END IF;

    IF v_status = 'completed' THEN
        RAISE EXCEPTION 'Appointment is already completed';
    END IF;

    v_method := lower(p_payment_method);
    IF v_method NOT IN ('pix', 'cash', 'debit', 'credit', 'other') THEN
        v_method := 'other';
    END IF;

    -- Package consumption
    IF p_package_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.packages WHERE id = p_package_id AND organization_id = v_org_id AND client_id = v_client_id) THEN
            RAISE EXCEPTION 'Package does not belong to client or organization';
        END IF;

        UPDATE public.packages
        SET remaining_sessions = remaining_sessions - 1
        WHERE id = p_package_id AND organization_id = v_org_id AND client_id = v_client_id AND remaining_sessions > 0;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No remaining sessions in package or package not found';
        END IF;

        INSERT INTO public.package_sessions (organization_id, package_id, appointment_id)
        VALUES (v_org_id, p_package_id, p_appointment_id);
    END IF;

    -- Payment
    IF p_payment_amount > 0 THEN
        INSERT INTO public.payments (organization_id, appointment_id, client_id, amount, method, status, kind, paid_at)
        VALUES (v_org_id, p_appointment_id, v_client_id, p_payment_amount, v_method, 'paid', 'payment', now());
    END IF;

    -- Commissions
    IF p_commissions IS NOT NULL AND jsonb_array_length(p_commissions) > 0 THEN
        FOR v_comm IN SELECT * FROM jsonb_to_recordset(p_commissions) AS x(appointment_item_id UUID, professional_id UUID, amount NUMERIC) LOOP
            IF NOT EXISTS (SELECT 1 FROM public.appointment_items WHERE id = v_comm.appointment_item_id AND appointment_id = p_appointment_id) THEN
                RAISE EXCEPTION 'Appointment item does not belong to appointment';
            END IF;
            INSERT INTO public.commissions (organization_id, appointment_item_id, professional_id, amount, status)
            VALUES (v_org_id, v_comm.appointment_item_id, v_comm.professional_id, v_comm.amount, 'generated');
        END LOOP;
    END IF;

    -- Inventory Deductions
    IF p_inventory_deductions IS NOT NULL AND jsonb_array_length(p_inventory_deductions) > 0 THEN
        FOR v_inv IN SELECT * FROM jsonb_to_recordset(p_inventory_deductions) AS x(product_id UUID, quantity NUMERIC, appointment_item_id UUID) LOOP
            IF NOT EXISTS (SELECT 1 FROM public.appointment_items WHERE id = v_inv.appointment_item_id AND appointment_id = p_appointment_id) THEN
                RAISE EXCEPTION 'Appointment item does not belong to appointment';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = v_inv.product_id AND organization_id = v_org_id) THEN
                RAISE EXCEPTION 'Product does not belong to organization';
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
