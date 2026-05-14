-- ============================================================
--  schema_pricing_ref_molde.sql — Referencia de tallas pantaloneta
--  Ejecutar en Supabase → SQL Editor (dev y producción).
--  Requiere schema_pricing.sql ya ejecutado.
-- ============================================================

-- Agrega referencia de tallas para pantaloneta, coexiste con la de camiseta.
ALTER TABLE public.pricing_config
  ADD COLUMN IF NOT EXISTS ref_cliente_id_pant TEXT,
  ADD COLUMN IF NOT EXISTS ref_gender_pant     TEXT,
  ADD COLUMN IF NOT EXISTS ref_molde_id_pant   TEXT;
