# SaaS Stack — SubliFlow

> Documento de arquitectura y roadmap completo para escalar `web-sublimania` a producto SaaS.
> Producto: **SubliFlow** | Empresa: Sublimania Studio
> Última actualización: 2026-04-27

---

## Estado actual (2026-04-27)

| Qué | Estado |
|---|---|
| Lógica de reglas por talla y jugador | ✅ Funciona |
| Exportación de CSV para Illustrator | ✅ Funciona |
| Gestión de equipos, clientes, tallas, moldes | ✅ Funciona |
| Auth (registro, login, logout, invites multi-tenant) | ✅ Implementado con Supabase |
| Schema DB auth/orgs en Supabase | ✅ Ejecutado (organizations, users, roles, RLS) |
| Trigger auto-crea org al registrar | ✅ Implementado (`trigger_register_org.sql`) |
| Persistencia datos de app | ⚠️ Solo localStorage (teams, players, tallas, clientes) |
| Acceso desde otro dispositivo/browser | ❌ No funciona — datos atrapados en el browser |
| Landing page | ✅ Construida y deployada en Vercel |
| App deployada | ❌ Solo corre local, no está en Vercel |
| Pagos / suscripciones | ❌ No existe |
| Emails transaccionales | ❌ No existe |

---

## Análisis: los 15 pilares de un SaaS real

Aplicado específicamente a SubliFlow (generador de uniformes deportivos):

| Pilar | Relevante | Estado | Notas |
|---|---|---|---|
| **1. Auth** | ✅ Crítico | ✅ Listo | Registro + login + logout + invites + multi-tenant |
| **2. Database** | ✅ Crítico | ⚠️ Parcial | Schema auth en Supabase ✅; datos de app aún en localStorage ❌ |
| **3. Payments** | ✅ Crítico | ❌ Pendiente | Stripe — sin esto no hay ingresos reales |
| **4. Security** | ✅ Crítico | ⚠️ Parcial | RLS en tablas auth ✅; tablas de app aún no existen en DB |
| **5. Frontend** | ✅ Crítico | ✅ Listo | React + TypeScript + Bootstrap, UI completa |
| **6. Backend** | ✅ Crítico | ✅ Listo | Supabase maneja todo — no se necesita backend custom |
| **7. Notifications** | ⚠️ Importante | ❌ Pendiente | Resend para welcome email; reset ya lo maneja Supabase |
| **8. Analytics** | ⚠️ Nice-to-have | ❌ No es MVP | PostHog free tier — agregar después del lanzamiento |
| **9. Error handling** | ⚠️ Importante | ⚠️ Básico | Toasts en auth; falta error boundary global |
| **10. Logging** | ⬇️ Bajo | ✅ Suficiente | Supabase logs + Vercel logs bastan para el MVP |
| **11. File storage** | ❌ No aplica | — | SubliFlow exporta CSVs al disco local — no hay uploads |
| **12. Settings** | ✅ Crítico | ✅ Listo | SettingsScreen con tabs: Usuarios, Clientes, Tallas, Moldes |
| **13. Onboarding** | ⚠️ Importante | ❌ Pendiente | No hay flujo de primera vez; la app es suficientemente simple por ahora |
| **14. Performance** | ⚠️ Importante | ✅ Listo | Vite build + Vercel CDN — no hay problema aquí |
| **15. Landing page** | ✅ Crítico | ✅ Listo | Construida en Astro, deployada en Vercel |

> **File Storage (punto 11): NO se necesita.** SubliFlow genera CSVs que se descargan al disco del usuario. No hay imágenes ni uploads de archivos. Supabase Storage queda fuera del stack por ahora.

---

## Stack Definido

| Capa | Tecnología | Estado |
|---|---|---|
| **App principal** | React 19 + Vite + TypeScript | ✅ Existe |
| **Estado UI** | Zustand | ✅ Existe (pendiente migrar datos a DB) |
| **Base de datos + Auth** | Supabase (PostgreSQL + Auth) | ✅ Proyecto creado, schema auth ejecutado |
| **Pagos** | Stripe | ❌ Pendiente |
| **Emails** | Resend | ❌ Pendiente |
| **Landing page** | Astro | ✅ Deployada en Vercel |
| **Hosting app** | Vercel | ❌ Pendiente conectar |
| **Backend custom** | — | No necesario, Supabase alcanza |

---

## Costos Estimados

| Etapa | Vercel | Supabase | Resend | Stripe | Total |
|---|---|---|---|---|---|
| MVP / primeros clientes | Free | Free | Free | 2.9% + $0.30/tx | **$0/mes fijo** |
| Creciendo (>500 usuarios) | $20/mes | $25/mes | $20/mes | variable | **~$65/mes + % ventas** |

---

## Arquitectura

```
┌──────────────────────────────┐
│   sublimania.com / landing   │
│   (Astro — Vercel) ✅        │
│   CTA → app.sublimania.com   │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│   app.sublimania.com         │
│   (React — Vercel) ❌ deploy │
│   Auth → Teams → Export      │
└──────────────┬───────────────┘
               ↓ ↑ supabase-js
┌──────────────────────────────┐
│   Supabase                   │
│   ├── Auth (sesiones) ✅     │
│   ├── PostgreSQL (datos) ⚠️  │
│   │     auth/orgs: ✅        │
│   │     teams/players: ❌    │
│   └── RLS (aislamiento) ⚠️  │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│   Stripe + Resend            │
│   Pagos ❌ / Emails ❌       │
└──────────────────────────────┘
```

---

## Schema de Base de Datos

### Auth + Multi-tenant (ejecutado ✅)
```sql
organizations  (id, name, slug, plan, plan_status, trial_ends_at)
users          (id, email, nombre, org_id → organizations)
roles          (id, name)
permissions    (id, name)
user_roles     (user_id, role_id)
role_permissions (role_id, permission_id)
invites        (id, org_id, email, role_id, token, accepted_at, expires_at)
```

### Datos de app (pendiente migrar ❌)
```sql
clientes       (id, org_id, nombre, casa_costurera)
tallas_config  (id, cliente_id, org_id, talla, alto, ancho, manga_alto, manga_ancho)

teams          (id, org_id, nombre, notas, base_team_id, created_at, updated_at)
players        (id, team_id, nombre, nombre_camiseta, numero, talla)
talla_rules    (id, team_id, talla, rules JSONB)
player_overrides (id, team_id, player_id, overrides JSONB)

export_history (id, team_id, talla, exported_at, cliente_id)
```

> `rules JSONB` y `overrides JSONB` guardan exactamente la estructura que hoy
> vive en `localStorage`. Sin cambios en la UI — solo cambia de dónde vienen los datos.

---

## Planes y Límites (propuesta)

| Feature | Free | Pro ($X/mes) |
|---|---|---|
| Equipos | 3 | Ilimitados |
| Jugadores por equipo | 20 | Ilimitados |
| Clientes (costureras) | 1 | Ilimitados |
| Exportaciones / mes | 10 | Ilimitadas |
| Datos en la nube | ✅ (ambos) | ✅ (ambos) |
| Usuarios en la org | 1 | Ilimitados |
| Soporte prioritario | ❌ | ✅ |

> Los límites exactos se ajustan con los primeros usuarios reales.

---

## Roadmap

### Fase 0 — Landing Page ✅ Completa
- [x] Proyecto Astro en `landing/`
- [x] Secciones: Hero, Problema/Solución, Features, Pricing, Early Access, Footer
- [x] Páginas legales: `/terminos`, `/privacidad`
- [x] Deploy en Vercel
- [ ] Dominio propio conectado (`sublimania.com` o `subliflow.com`)
- [ ] Formulario Early Access → guardar email en Supabase o Resend audience

---

### Fase 1 — Auth ✅ Completa (código listo, falta deploy)
- [x] Proyecto Supabase creado
- [x] Schema SQL ejecutado (organizations, users, roles, RLS)
- [x] Trigger `handle_new_user` — crea org automáticamente al registrar
- [x] `supabase.ts` + `authService.ts` + `useAuthStore.ts`
- [x] `AuthScreen.tsx` — Login / Registro / Accept Invite
- [x] `UsersTab.tsx` — admin puede invitar y cambiar roles
- [ ] **Deploy app en Vercel** ← próximo paso inmediato
- [ ] Verificar primer registro real con confirm email OFF en Supabase

---

### Fase 2 — Cloud Persistence ❌ Pendiente (bloque principal)
> Objetivo: datos en la nube. Sin esto no hay SaaS real.

- [ ] Crear tablas `clientes`, `tallas_config`, `teams`, `players`, `talla_rules`, `player_overrides`, `export_history` en Supabase
- [ ] Agregar RLS con política `org_id = my_org_id()` a cada tabla
- [ ] Instalar `@tanstack/react-query`
- [ ] Migrar `useClientesStore` → queries/mutations contra `clientes`
- [ ] Migrar `useTallasStore` → queries/mutations contra `tallas_config`
- [ ] Migrar `useTeamsStore` → queries/mutations contra `teams`
- [ ] Migrar `useTeamStore` (players, rules, overrides) → tablas correspondientes
- [ ] Migrar `useExportHistoryStore` → tabla `export_history`
- [ ] Eliminar `persist(localStorage)` de todos los stores migrados

**Resultado:** datos seguros en la nube, acceso desde cualquier dispositivo, aislamiento real por org.

---

### Fase 3 — Billing ❌ Pendiente
> Objetivo: primeros ingresos reales.

- [ ] Cuenta Stripe + producto "SubliFlow Pro" configurado
- [ ] Columna `stripe_customer_id` + `plan` en `organizations`
- [ ] Límites por plan en la app (Free: 3 equipos, etc.)
- [ ] Botón "Upgrade a Pro" → Stripe Checkout
- [ ] Webhook Stripe → actualizar `organizations.plan` en Supabase
- [ ] Email de aviso de pago fallido (Resend)
- [ ] Indicador de uso: "3/3 equipos — Actualiza tu plan"

**Resultado:** usuarios pueden pagar, ingresos reales.

---

### Fase 4 — Emails + Onboarding ❌ Pendiente
- [ ] Resend configurado
- [ ] Email de bienvenida post-registro
- [ ] Email de invitación a empleados (hoy el link se copia manual)
- [ ] Flujo de primer uso: pantalla/modal que guía al nuevo usuario
- [ ] Landing → formulario Early Access guarda emails reales

---

### Fase 5 — Pulido ❌ Futuro
- [ ] Error boundary global + mensajes de error amigables
- [ ] Analytics con PostHog (free tier)
- [ ] Dashboard: plan actual, uso, historial de exportaciones
- [ ] Gestión de suscripción (cancelar, cambiar plan)
- [ ] Conectar landing CTA directamente a `app.sublimania.com/registro`
- [ ] API directa plugin Illustrator ↔ Supabase (sin CSV manual)

---

## Principios

1. **Simple primero** — Supabase evita backend custom; Stripe evita billing propio
2. **Free hasta tener ingresos** — todo el stack es $0 hasta que haya clientes reales
3. **Datos aislados por org** — RLS garantiza que ningún cliente ve datos de otro
4. **Sin File Storage** — SubliFlow no necesita uploads; los CSVs van al disco local
5. **Deploy automático** — `git push main` → Vercel redeploya sin intervención
