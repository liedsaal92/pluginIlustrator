# Pase a Producción — Sublimania Web

## Regla de oro
**NUNCA ejecutar schema.sql ni schema_app_data.sql en prod.** Esas tablas ya existen con datos reales.
Ejecutar SOLO los archivos listados abajo, en el orden indicado.

---

## Estado de archivos SQL

| Archivo | Estado | Acción |
|---------|--------|--------|
| `schema.sql` | ✅ Ya en prod | **NO ejecutar** |
| `schema_app_data.sql` | ✅ Ya en prod | **NO ejecutar** |
| `schema_rename_role_cliente.sql` | ⚠️ Una sola vez | Ejecutar si no se ha hecho |
| `schema_tallas_default.sql` | ⚠️ Migración segura | Ejecutar (IF NOT EXISTS) |
| `schema_pantalonetas.sql` | ⚠️ Migración segura | Ejecutar (ADD COLUMN IF NOT EXISTS) |
| `schema_portal.sql` | ⚠️ Migración segura | Ejecutar (IF NOT EXISTS) |
| `schema_pricing.sql` | 🆕 Nuevo módulo | Ejecutar (IF NOT EXISTS en todo) |
| `schema_pricing_ref_molde.sql` | 🆕 Columnas nuevas | Ejecutar después de pricing |

---

## Orden de ejecución en Supabase → SQL Editor

### PASO 1 — Migración roles (si no se ha hecho)
```
schema_rename_role_cliente.sql
```
Renombra rol `costurera` → `cliente`. Idempotente (UPDATE seguro si ya se hizo).

### PASO 2 — Soporte pantalonetas
```
schema_tallas_default.sql
schema_pantalonetas.sql
```
Agrega columna `tipo` a `moldes` y `talla_pant` a `players`. Seguros con `IF NOT EXISTS`.

### PASO 3 — Portal de jugadores
```
schema_portal.sql
```
Agrega `portal_links`, columnas a `teams`/`players`, RPCs públicos. Seguro con `IF NOT EXISTS`.

### PASO 4 — Módulo de precios (cotizador)
```
schema_pricing.sql
schema_pricing_ref_molde.sql
```
Crea 15 tablas del cotizador + 3 columnas de referencia pantaloneta.
**Ambos archivos son completamente seguros** — usan `CREATE TABLE IF NOT EXISTS` y políticas idempotentes.

### PASO 5 — Deploy de código
```bash
cd web-sublimania
npm run build
# Subir dist/ al hosting (Vercel / Netlify / servidor)
```

---

## Verificación post-pase

Ejecutar en SQL Editor para verificar que las tablas existen:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'pricing_%'
ORDER BY table_name;
```

Debe mostrar 15 tablas: `pricing_base_prices`, `pricing_cliente_tipos`, `pricing_cm_price_tiers`,
`pricing_competitors`, `pricing_config`, `pricing_cotizaciones`, `pricing_fabrics`,
`pricing_machines`, `pricing_operations`, `pricing_print_profiles`, `pricing_quote_history`,
`pricing_supplies`, `pricing_tabla_exports`, `pricing_tipos_cliente`, `pricing_volume_tiers`.

Verificar columnas pantaloneta en pricing_config:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'pricing_config'
  AND column_name LIKE 'ref_%';
-- Debe mostrar: ref_cliente_id, ref_gender, ref_cliente_id_pant, ref_gender_pant, ref_molde_id_pant
```

Verificar columnas de pantalonetas en tablas de app:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'players' AND column_name = 'talla_pant';
SELECT column_name FROM information_schema.columns
WHERE table_name = 'moldes' AND column_name = 'tipo';
```

---

## ⚠️ Lo que NUNCA hacer en prod

- `DROP TABLE` — borraría datos reales
- `TRUNCATE` — borraría datos reales
- Re-ejecutar `schema.sql` o `schema_app_data.sql` — fallaría en tablas existentes (no borra, pero genera errores)
- `DELETE FROM roles` o `DELETE FROM permissions` — rompe el auth

---

## Variables de entorno requeridas

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Verificar que el `.env.production` apunta al proyecto de Supabase de PRODUCCIÓN, no al de dev.
