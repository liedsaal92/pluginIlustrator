# SaaS Stack — SubliFlow

> Documento de arquitectura y roadmap completo para escalar `web-sublimania` a producto SaaS.
> Producto: **SubliFlow** | Empresa: Sublimania Studio
> Última actualización: 2026-04-28

---

## Estado actual (2026-04-28)

| Qué | Estado |
|---|---|
| Lógica de reglas por talla y jugador | ✅ Funciona |
| Exportación de CSV para Illustrator | ✅ Funciona |
| Gestión de equipos, clientes, tallas, moldes | ✅ Funciona |
| Auth (registro, login, logout, invites multi-tenant) | ✅ Supabase |
| Password recovery (olvidé contraseña) | ✅ Implementado |
| Schema DB auth/orgs en Supabase | ✅ Ejecutado |
| Tablas de app en Supabase (8 tablas) | ✅ Ejecutado con RLS |
| Persistencia datos en la nube | ✅ Todos los stores migrados a Supabase |
| Acceso desde cualquier dispositivo | ✅ Funciona |
| App deployada en Vercel | ✅ https://web-subliflow.vercel.app |
| Landing page deployada | ✅ Vercel |
| Migración datos existentes (JSON → Supabase) | ⚠️ Pendiente |
| Pagos / suscripciones | ❌ No existe |
| Emails transaccionales | ❌ No existe |

---

## Análisis: los 15 pilares de un SaaS real

Aplicado específicamente a SubliFlow (generador de uniformes deportivos):

| Pilar | Relevante | Estado | Notas |
|---|---|---|---|
| **1. Auth** | ✅ Crítico | ✅ Listo | Login + registro + invites + recovery + multi-tenant |
| **2. Database** | ✅ Crítico | ✅ Listo | 8 tablas en Supabase, RLS por org, todos los stores migrados |
| **3. Payments** | ✅ Crítico | ❌ Pendiente | Stripe — sin esto no hay ingresos reales |
| **4. Security** | ✅ Crítico | ✅ Listo | RLS en todas las tablas con `my_org_id()` |
| **5. Frontend** | ✅ Crítico | ✅ Listo | React + TypeScript + Bootstrap, UI completa, en Vercel |
| **6. Backend** | ✅ Crítico | ✅ Listo | Supabase maneja todo — no se necesita backend custom |
| **7. Notifications** | ⚠️ Importante | ❌ Pendiente | Resend para welcome email; recovery ya funciona vía Supabase |
| **8. Analytics** | ⚠️ Nice-to-have | ❌ No es MVP | PostHog free tier — agregar post-lanzamiento |
| **9. Error handling** | ⚠️ Importante | ⚠️ Básico | Toasts en auth; falta error boundary global |
| **10. Logging** | ⬇️ Bajo | ✅ Suficiente | Supabase logs + Vercel logs bastan para MVP |
| **11. File storage** | ❌ No aplica | — | SubliFlow exporta CSVs al disco local — no hay uploads |
| **12. Settings** | ✅ Crítico | ✅ Listo | SettingsScreen: Usuarios, Clientes, Tallas, Moldes |
| **13. Onboarding** | ⚠️ Importante | ❌ Pendiente | Sin flujo de primera vez; app es simple, no es urgente |
| **14. Performance** | ⚠️ Importante | ✅ Listo | Vite build + Vercel CDN |
| **15. Landing page** | ✅ Crítico | ✅ Listo | Astro, deployada en Vercel |

> **File Storage (punto 11): NO se necesita.** SubliFlow genera CSVs que se descargan al disco del usuario. No hay imágenes ni uploads de archivos. Supabase Storage queda fuera del stack por ahora.

---

## Stack Definido

| Capa | Tecnología | Estado |
|---|---|---|
| **App principal** | React 19 + Vite + TypeScript | ✅ Deployada en Vercel |
| **Estado UI** | Zustand | ✅ Stores migrados a Supabase, puro in-memory para navegación |
| **Base de datos + Auth** | Supabase (PostgreSQL + Auth) | ✅ 8 tablas + RLS + auth completo |
| **Pagos** | Stripe | ❌ Pendiente |
| **Emails** | Resend | ❌ Pendiente |
| **Landing page** | Astro | ✅ Deployada en Vercel |
| **Hosting app** | Vercel | ✅ https://web-subliflow.vercel.app |
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
│   CTA → web-subliflow.vercel │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│   web-subliflow.vercel.app   │
│   (React — Vercel) ✅        │
│   Auth → Teams → Export      │
└──────────────┬───────────────┘
               ↓ ↑ supabase-js
┌──────────────────────────────┐
│   Supabase                   │
│   ├── Auth ✅                │
│   ├── PostgreSQL ✅          │
│   │     auth/orgs ✅         │
│   │     clientes ✅          │
│   │     moldes ✅            │
│   │     tallas_config ✅     │
│   │     teams/players ✅     │
│   │     talla_rules ✅       │
│   │     player_overrides ✅  │
│   └── RLS por org ✅         │
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

### Datos de app (ejecutado ✅ + stores migrados ✅)
```sql
clientes       (id TEXT, org_id UUID, nombre, casa_costurera)
moldes         (id TEXT, org_id UUID, nombre)
tallas_config  (org_id, cliente_id, molde_id, talla, alto, ancho, manga_alto, manga_ancho)

teams          (id TEXT, org_id UUID, nombre, notas, base_team_id, created_at, updated_at)
players        (team_id, org_id, position INT, nombre, nombre_camiseta, numero, talla)
talla_rules    (team_id, org_id, talla, rules JSONB)
player_overrides (team_id, org_id, player_position INT, overrides JSONB)

export_history (MVP: solo local, no persistido en DB)
```

> `rules JSONB` y `overrides JSONB` guardan la estructura existente sin cambios en la UI.

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

### Fase 1 — Auth ✅ Completa
- [x] Proyecto Supabase creado
- [x] Schema SQL ejecutado (organizations, users, roles, RLS)
- [x] Trigger `handle_new_user` — crea org automáticamente al registrar
- [x] `supabase.ts` + `authService.ts` + `useAuthStore.ts`
- [x] `AuthScreen.tsx` — Login / Registro / Accept Invite / **Password Recovery**
- [x] `UsersTab.tsx` — admin puede invitar y cambiar roles
- [x] App deployada en Vercel → https://web-subliflow.vercel.app

---

### Fase 2 — Cloud Persistence ✅ Completa
- [x] 8 tablas creadas en Supabase con RLS por org
- [x] `@tanstack/react-query` instalado
- [x] `useClientesStore` → Supabase `clientes`
- [x] `useMoldesStore` → Supabase `moldes`
- [x] `useTallasStore` → Supabase `tallas_config`
- [x] `useTeamsStore` → Supabase `teams + players + talla_rules + player_overrides`
- [x] `useTeamStore` → puro in-memory (working store, no necesita DB)
- [x] `persist(localStorage)` eliminado de todos los stores
- [ ] **Migración datos existentes** (JSON backup → Supabase) ← pendiente del usuario

**Resultado:** datos en la nube, acceso desde cualquier dispositivo, aislamiento real por org.

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
