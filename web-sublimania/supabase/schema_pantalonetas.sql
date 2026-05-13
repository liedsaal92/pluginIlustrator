-- ============================================================
--  schema_pantalonetas.sql — Soporte dimensiones pantaloneta
--  Ejecutar en Supabase → SQL Editor (dev y producción)
-- ============================================================

-- ── Columna talla_pant en players ────────────────────────────
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS talla_pant TEXT DEFAULT '';

-- ── Columna tipo en moldes ────────────────────────────────────
-- Diferencia moldes de camiseta vs pantaloneta.
-- Antes vivía en localStorage (useMoldeTiposStore) — migrado a Supabase.
ALTER TABLE moldes
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'camiseta';
