# Pase a Producción — SubliFlow

Checklist acumulativo de todo lo que se debe ejecutar/verificar al pasar a producción.
Agregar ítems a medida que se desarrolla. Marcar con `[x]` cuando se ejecuta en prod.

---

## Orden de ejecución — Scripts SQL

Ejecutar en **Supabase → SQL Editor** del proyecto de producción, **en este orden exacto**.

| # | Script | Descripción | Estado |
|---|--------|-------------|--------|
| 1 | `schema.sql` | Base: orgs, users, roles, permisos, funciones RLS | [ ] |
| 2 | `trigger_register_org.sql` | Trigger registro de usuarios y orgs | [ ] |
| 3 | `schema_app_data.sql` | Tablas de la app (moldes, clientes, teams, players, etc.) | [ ] |
| 4 | `schema_portal.sql` | Portal de jugadores (portal_links, columnas teams/players) | [ ] |
| 5 | `schema_rename_role_cliente.sql` | Migración: `costurera` → `cliente` _(ver nota abajo)_ | [ ] |
| 6 | `schema_pricing.sql` | Tablas del módulo de precios | [ ] |
| 7 | `schema_tallas_default.sql` | Tallas por defecto por molde _(ver nota abajo)_ | [ ] |
| 8 | `schema_pantalonetas.sql` | Columnas talla_pant en players, tipo en moldes | [ ] |
| 9 | `schema_pricing_ref_molde.sql` | Columnas referencia pantaloneta en pricing_config | [ ] |

---

## Notas por script

### `schema_rename_role_cliente.sql` (#5)
Solo ejecutar si en prod existe el rol con nombre `costurera`. Verificar antes:
```sql
SELECT name FROM roles WHERE name IN ('costurera', 'cliente');
```

### `schema_tallas_default.sql` (#7)
`schema_app_data.sql` ya incluye la tabla `tallas_default`. Este script es un **patch para instalaciones existentes** que corrieron una versión anterior de `schema_app_data.sql` sin esa tabla. Usa `CREATE TABLE IF NOT EXISTS` — no rompe si ya existe.

---

## Roles y Permisos — Verificación post-scripts

Después de ejecutar los scripts, confirmar que `role_permissions` tiene seed data. Si está vacía, los usuarios no tendrán acceso a nada:

```sql
-- Verificar
SELECT r.name AS rol, p.name AS permiso
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
ORDER BY r.name, p.name;
```

Si el resultado está vacío, re-sembrar:
```sql
-- Admin: todos los permisos
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Employee: operar sin admin ni billing
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'employee'
  AND p.name IN ('teams:read', 'teams:write', 'export:run')
ON CONFLICT DO NOTHING;
```

---

## Base de Datos — Próximas secciones (completar a medida que se agregan)

<!-- Agregar aquí nuevos scripts cuando se desarrollen -->

---

## Frontend / Código

- [ ] Verificar variables de entorno en Vercel/hosting:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

---

## Verificación Post-Deploy

- [ ] Login admin funciona
- [ ] Login empleado respeta permisos configurados en Ajustes → Roles
- [ ] Carga de Excel y exportación CSV funcionan
- [ ] Portal cliente accesible por token

---

## Historial de pases

| Fecha | Descripción | Ejecutado por |
|-------|-------------|---------------|
|       |             |               |
