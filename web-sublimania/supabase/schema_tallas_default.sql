-- ============================================================
--  schema_tallas_default.sql — Tallas por defecto por molde
--  Ejecutar en Supabase → SQL Editor ANTES de desplegar el código.
--  Requiere schema_app_data.sql (tabla organizations) ya ejecutado.
--  Orden de pase a PROD:
--    1. schema_pantalonetas.sql
--    2. schema_tallas_default.sql  ← este archivo
--    3. Deploy código
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tallas_default (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  molde_id    TEXT NOT NULL DEFAULT 'camiseta',
  talla       TEXT NOT NULL,
  alto        TEXT NOT NULL DEFAULT '',
  ancho       TEXT NOT NULL DEFAULT '',
  manga_ancho TEXT NOT NULL DEFAULT '',
  manga_alto  TEXT NOT NULL DEFAULT '',
  orden       INT  NOT NULL DEFAULT 0,
  UNIQUE (org_id, molde_id, talla)
);

ALTER TABLE public.tallas_default ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tallas_default: org isolation"
  ON public.tallas_default FOR ALL
  USING  (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

CREATE INDEX IF NOT EXISTS tallas_default_org_orden
  ON public.tallas_default (org_id, molde_id, orden);
