-- Migration: 202609290005_organization_slug_default.sql
-- Description: Ensure organizations table has slug column and assign default 'gabi-ludwig' slug.

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE public.organizations
SET slug = 'gabi-ludwig'
WHERE slug IS NULL OR slug = '';

-- Ensure unique constraint on slug if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'organizations_slug_key'
    ) THEN
        ALTER TABLE public.organizations ADD CONSTRAINT organizations_slug_key UNIQUE (slug);
    END IF;
END $$;
