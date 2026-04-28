-- ============================================================
--  Migración: renombrar rol 'costurera' → 'cliente'
--  Ejecutar en Supabase SQL Editor (una sola vez)
-- ============================================================

UPDATE roles SET name = 'cliente' WHERE name = 'costurera';

-- Verificar
SELECT name FROM roles WHERE name IN ('costurera', 'cliente');
