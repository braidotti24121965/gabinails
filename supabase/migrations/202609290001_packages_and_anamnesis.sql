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
    allergies TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_anamnesis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for packages
CREATE POLICY "Packages are visible to org users" ON public.packages
    FOR SELECT USING (organization_id = current_organization_id());
CREATE POLICY "Packages can be managed by org users" ON public.packages
    FOR ALL USING (organization_id = current_organization_id());

-- RLS Policies for package_sessions
CREATE POLICY "Package sessions are visible to org users" ON public.package_sessions
    FOR SELECT USING (organization_id = current_organization_id());
CREATE POLICY "Package sessions can be managed by org users" ON public.package_sessions
    FOR ALL USING (organization_id = current_organization_id());

-- RLS Policies for client_anamnesis
CREATE POLICY "Anamnesis are visible to org users" ON public.client_anamnesis
    FOR SELECT USING (organization_id = current_organization_id());
CREATE POLICY "Anamnesis can be managed by org users" ON public.client_anamnesis
    FOR ALL USING (organization_id = current_organization_id());


-- RPC for selling package atomically
CREATE OR REPLACE FUNCTION sell_package(
    p_organization_id UUID,
    p_client_id UUID,
    p_name TEXT,
    p_total_sessions INTEGER,
    p_price NUMERIC,
    p_payment_method TEXT,
    p_payment_status TEXT,
    p_expires_at TIMESTAMPTZ,
    p_appointment_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_package_id UUID;
BEGIN
    -- Insert package
    INSERT INTO public.packages (
        organization_id, client_id, name, total_sessions, remaining_sessions, price, expires_at, status
    ) VALUES (
        p_organization_id, p_client_id, p_name, p_total_sessions, p_total_sessions, p_price, p_expires_at, 'active'
    ) RETURNING id INTO v_package_id;

    -- Insert payment
    INSERT INTO public.payments (
        organization_id, appointment_id, client_id, amount, method, status, payment_type
    ) VALUES (
        p_organization_id, p_appointment_id, p_client_id, p_price, p_payment_method, p_payment_status, 'package'
    );

    RETURN v_package_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for finishing appointment and deducting package session
CREATE OR REPLACE FUNCTION use_package_session(
    p_package_id UUID,
    p_appointment_id UUID
) RETURNS VOID AS $$
BEGIN
    -- Deduct remaining sessions
    UPDATE public.packages
    SET remaining_sessions = remaining_sessions - 1
    WHERE id = p_package_id AND remaining_sessions > 0;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No remaining sessions in package';
    END IF;

    -- Create package session
    INSERT INTO public.package_sessions (
        organization_id, package_id, appointment_id
    )
    SELECT organization_id, p_package_id, p_appointment_id
    FROM public.packages WHERE id = p_package_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
