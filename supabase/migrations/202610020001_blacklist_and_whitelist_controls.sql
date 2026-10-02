-- Migration: 202610020001_blacklist_and_whitelist_controls.sql
-- Description: Adds client_blacklist table, manually_removed flag on client_deposit_whitelist,
-- and RPC functions for whitelist/blacklist management and auto-promotion.

-- ============================================================
-- 1. Adiciona coluna manually_removed na whitelist
--    Quando TRUE, esta cliente foi removida manualmente e
--    NÃO deve ser promovida automaticamente de novo.
-- ============================================================
ALTER TABLE public.client_deposit_whitelist
  ADD COLUMN IF NOT EXISTS manually_removed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_promoted    boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. Tabela client_blacklist
--    Clientes aqui são atendidas normalmente mas:
--    - Ficam marcadas visualmente para a Gabi
--    - Nunca entram na whitelist automática
--    - Sempre passam pelo fluxo normal de PIX 30 min online
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_blacklist (
  client_id       uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  reason          text,
  blocked_by      uuid NOT NULL REFERENCES auth.users(id),
  blocked_at      timestamptz NOT NULL DEFAULT now(),
  removed_by      uuid REFERENCES auth.users(id),
  removed_at      timestamptz,
  CONSTRAINT blacklist_removal_consistency
    CHECK ((removed_by IS NULL AND removed_at IS NULL)
        OR (removed_by IS NOT NULL AND removed_at IS NOT NULL))
);

ALTER TABLE public.client_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_blacklist_org_access ON public.client_blacklist
  FOR ALL TO authenticated
  USING (organization_id = (SELECT private.current_organization_id()))
  WITH CHECK (organization_id = (SELECT private.current_organization_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_blacklist TO authenticated;

-- ============================================================
-- 3. RPC: set_client_whitelist
--    add = true  → adiciona à whitelist (se não estiver)
--    add = false → remove da whitelist, seta manually_removed = true
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_client_whitelist(
  p_client_id uuid,
  p_add       boolean,
  p_reason    text DEFAULT NULL
)
RETURNS void
SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  v_org_id  := private.current_organization_id();
  v_user_id := auth.uid();

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated or no organization';
  END IF;

  -- Verificar que a cliente pertence à org
  IF NOT EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = p_client_id AND organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'Client not found or access denied';
  END IF;

  IF p_add THEN
    -- Inserir ou reativar registro existente
    INSERT INTO public.client_deposit_whitelist
      (client_id, organization_id, authorized_by, authorized_at,
       removed_by, removed_at, reason, manually_removed, auto_promoted)
    VALUES
      (p_client_id, v_org_id, v_user_id, now(),
       NULL, NULL, p_reason, false, false)
    ON CONFLICT (client_id) DO UPDATE
      SET authorized_by  = EXCLUDED.authorized_by,
          authorized_at  = EXCLUDED.authorized_at,
          removed_by     = NULL,
          removed_at     = NULL,
          reason         = EXCLUDED.reason,
          manually_removed = false,
          auto_promoted  = false;
  ELSE
    -- Remover: seta removed_by, removed_at e manually_removed = true
    UPDATE public.client_deposit_whitelist
    SET removed_by      = v_user_id,
        removed_at      = now(),
        manually_removed = true
    WHERE client_id = p_client_id
      AND organization_id = v_org_id
      AND removed_at IS NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.set_client_whitelist(uuid, boolean, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.set_client_whitelist(uuid, boolean, text) TO authenticated;

-- ============================================================
-- 4. RPC: set_client_blacklist
--    add = true  → bloqueia a cliente
--    add = false → desbloqueia
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_client_blacklist(
  p_client_id uuid,
  p_add       boolean,
  p_reason    text DEFAULT NULL
)
RETURNS void
SET search_path = ''
AS $$
DECLARE
  v_org_id  uuid;
  v_user_id uuid;
BEGIN
  v_org_id  := private.current_organization_id();
  v_user_id := auth.uid();

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated or no organization';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = p_client_id AND organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'Client not found or access denied';
  END IF;

  IF p_add THEN
    -- Se estava na whitelist, remove automaticamente
    UPDATE public.client_deposit_whitelist
    SET removed_by      = v_user_id,
        removed_at      = now(),
        manually_removed = true
    WHERE client_id = p_client_id
      AND organization_id = v_org_id
      AND removed_at IS NULL;

    INSERT INTO public.client_blacklist
      (client_id, organization_id, reason, blocked_by, blocked_at,
       removed_by, removed_at)
    VALUES
      (p_client_id, v_org_id, p_reason, v_user_id, now(), NULL, NULL)
    ON CONFLICT (client_id) DO UPDATE
      SET reason     = EXCLUDED.reason,
          blocked_by = EXCLUDED.blocked_by,
          blocked_at = EXCLUDED.blocked_at,
          removed_by = NULL,
          removed_at = NULL;
  ELSE
    UPDATE public.client_blacklist
    SET removed_by = v_user_id,
        removed_at = now()
    WHERE client_id = p_client_id
      AND organization_id = v_org_id
      AND removed_at IS NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.set_client_blacklist(uuid, boolean, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.set_client_blacklist(uuid, boolean, text) TO authenticated;

-- ============================================================
-- 5. RPC: auto_promote_whitelist
--    Promove para whitelist clientes com >= p_min_visits visitas
--    concluídas, que NÃO tenham manually_removed = true
--    e que NÃO estejam na blacklist.
--    Retorna o número de clientes promovidas.
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_promote_whitelist(
  p_min_visits integer DEFAULT 3
)
RETURNS integer
SET search_path = ''
AS $$
DECLARE
  v_org_id   uuid;
  v_promoted integer := 0;
  v_client   record;
BEGIN
  v_org_id := private.current_organization_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated or no organization';
  END IF;

  FOR v_client IN
    SELECT c.id
    FROM public.clients c
    WHERE c.organization_id = v_org_id
      AND c.status = 'active'
      -- Tem o mínimo de visitas concluídas
      AND (
        SELECT count(*) FROM public.appointments a
        WHERE a.client_id = c.id
          AND a.organization_id = v_org_id
          AND a.status = 'completed'
      ) >= p_min_visits
      -- NÃO está na blacklist (ativa)
      AND NOT EXISTS (
        SELECT 1 FROM public.client_blacklist bl
        WHERE bl.client_id = c.id
          AND bl.organization_id = v_org_id
          AND bl.removed_at IS NULL
      )
      -- NÃO foi removida manualmente da whitelist
      AND NOT EXISTS (
        SELECT 1 FROM public.client_deposit_whitelist wl
        WHERE wl.client_id = c.id
          AND wl.organization_id = v_org_id
          AND wl.manually_removed = true
      )
      -- NÃO está já na whitelist ativa
      AND NOT EXISTS (
        SELECT 1 FROM public.client_deposit_whitelist wl
        WHERE wl.client_id = c.id
          AND wl.organization_id = v_org_id
          AND wl.removed_at IS NULL
      )
  LOOP
    INSERT INTO public.client_deposit_whitelist
      (client_id, organization_id, authorized_by, authorized_at,
       removed_by, removed_at, reason, manually_removed, auto_promoted)
    VALUES
      (v_client.id, v_org_id, auth.uid(), now(),
       NULL, NULL, 'Promoção automática por frequência', false, true)
    ON CONFLICT (client_id) DO UPDATE
      SET authorized_by  = EXCLUDED.authorized_by,
          authorized_at  = EXCLUDED.authorized_at,
          removed_by     = NULL,
          removed_at     = NULL,
          reason         = EXCLUDED.reason,
          manually_removed = false,
          auto_promoted  = true;

    v_promoted := v_promoted + 1;
  END LOOP;

  RETURN v_promoted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.auto_promote_whitelist(integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.auto_promote_whitelist(integer) TO authenticated;
