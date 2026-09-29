-- Fix sell_package security to ensure client belongs to org
CREATE OR REPLACE FUNCTION public.sell_package(
    p_client_id UUID,
    p_name TEXT,
    p_total_sessions INT,
    p_price NUMERIC,
    p_payment_method TEXT,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_package_id UUID;
    v_org_id UUID;
    v_method TEXT;
BEGIN
    v_org_id := private.current_organization_id();
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated or no organization';
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


-- Fully atomic checkout including commissions and inventory
CREATE OR REPLACE FUNCTION public.finish_appointment_checkout_full(
    p_appointment_id UUID,
    p_payment_amount NUMERIC,
    p_payment_method TEXT,
    p_package_id UUID,
    p_commissions JSONB,
    p_inventory_deductions JSONB
) RETURNS VOID AS $$
DECLARE
    v_org_id UUID;
    v_client_id UUID;
    v_method TEXT;
    v_comm record;
    v_inv record;
BEGIN
    v_org_id := private.current_organization_id();
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated or no organization';
    END IF;

    SELECT client_id INTO v_client_id FROM public.appointments WHERE id = p_appointment_id AND organization_id = v_org_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found';
    END IF;

    v_method := lower(p_payment_method);
    IF v_method NOT IN ('pix', 'cash', 'debit', 'credit', 'other') THEN
        v_method := 'other';
    END IF;

    -- Package consumption
    IF p_package_id IS NOT NULL THEN
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
            INSERT INTO public.commissions (organization_id, appointment_item_id, professional_id, amount, status)
            VALUES (v_org_id, v_comm.appointment_item_id, v_comm.professional_id, v_comm.amount, 'generated');
        END LOOP;
    END IF;

    -- Inventory Deductions
    IF p_inventory_deductions IS NOT NULL AND jsonb_array_length(p_inventory_deductions) > 0 THEN
        FOR v_inv IN SELECT * FROM jsonb_to_recordset(p_inventory_deductions) AS x(product_id UUID, quantity NUMERIC) LOOP
            INSERT INTO public.stock_movements (organization_id, product_id, type, quantity, reason)
            VALUES (v_org_id, v_inv.product_id, 'out', v_inv.quantity, 'Uso em atendimento');
            
            UPDATE public.products 
            SET current_stock = current_stock - v_inv.quantity 
            WHERE id = v_inv.product_id AND organization_id = v_org_id;
        END LOOP;
    END IF;

    -- Mark Appointment Completed
    UPDATE public.appointments
    SET status = 'completed', actual_end_at = now()
    WHERE id = p_appointment_id AND organization_id = v_org_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION finish_appointment_checkout_full FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finish_appointment_checkout_full TO authenticated;

