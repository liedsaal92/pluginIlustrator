# Pase a producción — Equipos agrupados por cliente

Ejecutar en Supabase SQL Editor (producción) antes de deployar esta versión.

## Migración

```sql
-- Agrega columna cliente_id a teams (nullable, no rompe datos existentes)
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS cliente_id TEXT;
```

## Verificación

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'teams' AND column_name = 'cliente_id';
-- Debe retornar una fila
```

## Notas

- Equipos existentes quedan con `cliente_id = NULL` → aparecen en "Sin cliente" en la UI.
- No requiere migración de datos. Los clientes se asignan desde la app.
