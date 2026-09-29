-- Packages
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    total_sessions INTEGER NOT NULL,
    remaining_sessions INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Package Sessions
CREATE TABLE IF NOT EXISTS public.package_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'used' CHECK (status IN ('used', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client Anamnesis
CREATE TABLE IF NOT EXISTS public.client_anamnesis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
    diabetes BOOLEAN DEFAULT false,
    pregnant BOOLEAN DEFAULT false,
    nail_biting BOOLEAN DEFAULT false,
    allergies TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_anamnesis ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Packages are visible to org users" ON public.packages FOR SELECT USING (organization_id = private.current_organization_id());
CREATE POLICY "Packages can be managed by org users" ON public.packages FOR ALL USING (organization_id = private.current_organization_id());
CREATE POLICY "Package sessions are visible to org users" ON public.package_sessions FOR SELECT USING (organization_id = private.current_organization_id());
CREATE POLICY "Package sessions can be managed by org users" ON public.package_sessions FOR ALL USING (organization_id = private.current_organization_id());
CREATE POLICY "Anamnesis are visible to org users" ON public.client_anamnesis FOR SELECT USING (organization_id = private.current_organization_id());
CREATE POLICY "Anamnesis can be managed by org users" ON public.client_anamnesis FOR ALL USING (organization_id = private.current_organization_id());

-- Revoke public execution of sensitive RPCs
-- Note: the following functions will be created, so we drop if they exist
DROP FUNCTION IF EXISTS sell_package;
DROP FUNCTION IF EXISTS use_package_session;
DROP FUNCTION IF EXISTS finish_appointment_checkout;

CREATE OR REPLACE FUNCTION sell_package(
    p_client_id UUID,
    p_name TEXT,
    p_total_sessions INTEGER,
    p_price NUMERIC,
    p_payment_method TEXT,
    p_expires_at TIMESTAMPTZ,
    p_appointment_id UUID DEFAULT NULL
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

    -- Normalize payment method
    v_method := lower(p_payment_method);
    IF v_method NOT IN ('pix', 'cash', 'debit', 'credit', 'other') THEN
        v_method := 'other';
    END IF;

    -- Insert package
    INSERT INTO public.packages (
        organization_id, client_id, name, total_sessions, remaining_sessions, price, expires_at, status
    ) VALUES (
        v_org_id, p_client_id, p_name, p_total_sessions, p_total_sessions, p_price, p_expires_at, 'active'
    ) RETURNING id INTO v_package_id;

    -- Insert payment
    INSERT INTO public.payments (
        organization_id, appointment_id, client_id, amount, method, status, kind
    ) VALUES (
        v_org_id, p_appointment_id, p_client_id, p_price, v_method, 'paid', 'payment'
    );

    RETURN v_package_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION sell_package FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sell_package TO authenticated;


CREATE OR REPLACE FUNCTION finish_appointment_checkout(
    p_appointment_id UUID,
    p_payment_amount NUMERIC,
    p_payment_method TEXT,
    p_package_id UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_org_id UUID;
    v_client_id UUID;
    v_method TEXT;
BEGIN
    v_org_id := private.current_organization_id();
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated or no organization';
    END IF;

    SELECT client_id INTO v_client_id FROM public.appointments WHERE id = p_appointment_id AND organization_id = v_org_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found';
    END IF;

    -- Normalize payment method
    v_method := lower(p_payment_method);
    IF v_method NOT IN ('pix', 'cash', 'debit', 'credit', 'other') THEN
        v_method := 'other';
    END IF;

    -- If package_id is provided, consume a session
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

    -- If payment_amount > 0, insert payment
    IF p_payment_amount > 0 THEN
        INSERT INTO public.payments (organization_id, appointment_id, client_id, amount, method, status, kind, paid_at)
        VALUES (v_org_id, p_appointment_id, v_client_id, p_payment_amount, v_method, 'paid', 'payment', now());
    END IF;

    -- Mark appointment as completed
    UPDATE public.appointments
    SET status = 'completed', actual_end_at = now()
    WHERE id = p_appointment_id AND organization_id = v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION finish_appointment_checkout FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finish_appointment_checkout TO authenticated;

