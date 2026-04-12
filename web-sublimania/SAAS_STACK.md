# SaaS Stack — SubliFlow

> Documento de arquitectura y roadmap completo para escalar `web-sublimania` a producto SaaS.
> Producto: **SubliFlow** | Empresa: Sublimania Studio
> Última actualización: 2026-04-11

---

## Lo que existe hoy

| Qué | Estado |
|---|---|
| Lógica de reglas por talla y jugador | ✅ Funciona |
| Exportación de CSV para Illustrator | ✅ Funciona |
| Gestión de equipos, clientes, tallas | ✅ Funciona |
| Persistencia de datos | ⚠️ Solo localStorage (se pierde si limpian caché) |
| Acceso desde otro dispositivo/browser | ❌ No existe |
| Cuentas de usuario / login | ❌ No existe |
| Landing page / cara pública | ✅ Construida (pendiente deploy + dominio) |
| Pagos / suscripciones | ❌ No existe |
| Emails transaccionales | ❌ No existe |

---

## Stack Definido

| Capa | Tecnología | Rol |
|---|---|---|
| **App principal** | React 19 + Vite + TypeScript | Ya existe — no se reescribe |
| **Estado UI** | Zustand | Solo estado local (tabs, pantalla activa) |
| **Sincronización API** | TanStack Query | Cache y fetching de datos del servidor |
| **Base de datos + Auth + API** | Supabase | PostgreSQL + Auth + Storage — reemplaza localStorage |
| **Pagos** | Stripe | Suscripciones, checkout, webhooks |
| **Emails** | Resend | Bienvenida, verificación, reset, avisos de pago |
| **Landing page** | Astro | Sitio estático de marketing (rápido, SEO-friendly) |
| **Hosting app** | Vercel | Deploy automático desde GitHub |
| **Hosting landing** | Vercel | Mismo account, dominio principal |
| **Backend custom** | Node.js + Fastify *(futuro)* | Solo si Supabase no alcanza |

---

## Costos Estimados

| Etapa | Vercel | Supabase | Resend | Total |
|---|---|---|---|---|
| Desarrollo / MVP | Free | Free | Free | **$0/mes** |
| Primeros clientes | Free | Free | Free | **$0/mes** |
| Creciendo (>500 usuarios) | $20/mes | $25/mes | $20/mes | **~$65/mes** |

> Supabase Free: 50,000 rows, 500MB storage, 50MB DB.
> Resend Free: 3,000 emails/mes.
> Vercel Free: suficiente para tráfico moderado.

---

## Arquitectura Completa

```
                    ┌─────────────────────────────┐
                    │     sublimania.com           │
                    │     (Landing Page - Astro)   │
                    │  Hero / Features / Pricing   │
                    │       CTA → Registro         │
                    └────────────┬────────────────┘
                                 ↓
                    ┌─────────────────────────────┐
                    │     app.sublimania.com       │
                    │     (App React - Vercel)     │
                    │  Login → App → Dashboard     │
                    └────────────┬────────────────┘
                                 ↓ ↑  supabase-js
                    ┌─────────────────────────────┐
                    │         Supabase             │
                    │  ├── PostgreSQL (datos)      │
                    │  ├── Auth (sesiones)         │
                    │  └── Storage (backups)       │
                    └────────────┬────────────────┘
                                 ↓
                    ┌─────────────────────────────┐
                    │    Stripe + Resend           │
                    │  Pagos / Emails              │
                    └─────────────────────────────┘
```

---

## Schema de Base de Datos

```sql
users              (id, email, name, plan, stripe_customer_id, created_at)

  ├── clientes     (id, user_id, nombre, casa_costurera)
  │    └── tallas_config (id, cliente_id, talla, alto, ancho, manga_alto, manga_ancho)
  │
  ├── teams        (id, user_id, nombre, notas, base_team_id, created_at, updated_at)
  │    ├── players         (id, team_id, nombre, nombre_camiseta, numero, talla)
  │    ├── talla_rules     (id, team_id, talla, rules JSONB)
  │    └── player_overrides (id, team_id, player_id, overrides JSONB)
  │
  └── export_history (id, team_id, talla, exported_at, cliente_id)
```

> `rules JSONB` y `overrides JSONB` guardan exactamente la estructura que hoy
> vive en `localStorage` — sin necesidad de 175 columnas separadas.

---

## Planes y Límites (propuesta)

| Feature | Free | Pro ($X/mes) |
|---|---|---|
| Equipos | 3 | Ilimitados |
| Jugadores por equipo | 20 | Ilimitados |
| Clientes (costureras) | 1 | Ilimitados |
| Exportaciones / mes | 10 | Ilimitadas |
| Backups en la nube | ❌ | ✅ |
| Acceso multi-dispositivo | ✅ | ✅ |
| Soporte prioritario | ❌ | ✅ |

> Los límites exactos se definen al validar con primeros usuarios reales.

---

## Roadmap de Construcción

### Fase 0 — Landing Page ⚠️ Construida — pendiente deploy
> Objetivo: tener presencia pública antes de lanzar. Que alguien pueda llegar y entender qué es esto.

- [x] Crear proyecto Astro en `landing/`
- [x] Secciones: Hero, Problema/Solución, Features, Pricing, Early Access, Footer
- [x] Páginas legales: `/terminos`, `/privacidad`
- [x] Diseño y estilos completos
- [ ] Instalar dependencias (`npm install` en `landing/`)
- [ ] Dominio propio (`subliflow.com` o `sublimania.com`)
- [ ] Deploy en Vercel → dominio principal
- [ ] App React queda en `app.subliflow.com`
- [ ] Conectar formulario de Early Access a un servicio real (Resend / Supabase)

**Resultado:** cualquier persona puede llegar, entender el producto y dejar su email.

---

### Fase 1 — Auth + Cloud Persistence
> Objetivo: datos en la nube, login funcional. UI de la app no cambia visualmente.

- [ ] Crear proyecto en [supabase.com](https://supabase.com)
- [ ] Definir schema SQL completo
- [ ] Instalar `@supabase/supabase-js` y `@tanstack/react-query`
- [ ] Crear `src/lib/supabase.ts`
- [ ] Pantalla de Login / Registro (antes de `TeamsScreen`)
- [ ] Rutas protegidas (redirigir a login si no hay sesión)
- [ ] Migrar `useTeamsStore` → tabla `teams`
- [ ] Migrar `useTeamStore` → tablas `players`, `talla_rules`, `player_overrides`
- [ ] Migrar `useClientesStore` → tabla `clientes`
- [ ] Migrar `useTallasStore` → tabla `tallas_config`
- [ ] Migrar `useExportHistoryStore` → tabla `export_history`
- [ ] Conectar repo a Vercel → deploy en `app.sublimania.com`
- [ ] Emails transaccionales con Resend: bienvenida + verificación + reset

**Resultado:** app funcional en la nube, datos persistentes por usuario, acceso desde cualquier dispositivo.

---

### Fase 2 — Billing + Planes
> Objetivo: modelo de suscripción funcional, primeros ingresos reales.

- [ ] Cuenta Stripe + productos/precios configurados
- [ ] Row Level Security en Supabase (cada usuario solo ve sus datos)
- [ ] Límites por plan en la app (Free: 3 equipos, etc.)
- [ ] Stripe Checkout integrado (botón "Upgrade a Pro")
- [ ] Webhooks de Stripe → actualizar `users.plan` en Supabase
- [ ] Página de cuenta / billing dentro de la app
- [ ] Email de aviso de pago fallido (Resend)
- [ ] Indicador de uso visible ("3/3 equipos — Actualiza tu plan")

**Resultado:** usuarios pueden pagar, ingresos reales.

---

### Fase 3 — Dashboard + Pulido
> Objetivo: producto terminado que retiene usuarios y genera referidos.

- [ ] Dashboard de usuario (plan actual, uso, historial de pagos)
- [ ] Gestión de suscripción (cancelar, cambiar plan)
- [ ] Historial de cambios por equipo
- [ ] Plantillas públicas de equipos
- [ ] API para conectar directamente con el plugin de Illustrator
- [ ] Analytics de uso (PostHog o similar)
- [ ] Multi-idioma si se apunta a otros mercados

---

## Migración de localStorage → Supabase

```typescript
// ANTES — datos en el browser
persist(set => ({ teams: [] }), { name: 'sublimania_teams_v1' })

// DESPUÉS — datos en la DB, misma interfaz para la UI
export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data } = await supabase
        .from('teams')
        .select('*')
        .order('updated_at', { ascending: false })
      return data
    }
  })
}

export function useCreateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (team: NewTeam) => {
      const { data } = await supabase.from('teams').insert(team).select().single()
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] })
  })
}
```

---

## Principios de este Stack

1. **Simple primero** — Supabase evita escribir y hospedar un backend propio hasta que sea necesario
2. **Escala progresiva** — Free tier aguanta el MVP; se paga solo cuando hay ingresos
3. **Sin lock-in crítico** — PostgreSQL es estándar; se puede migrar si es necesario
4. **TypeScript end-to-end** — Supabase genera tipos desde el schema
5. **Deploy automático** — cada `git push` a `main` despliega en Vercel
6. **Landing separada de la app** — Astro para marketing (SEO), React para la herramienta

---

## Próximo Paso: Auth + Cloud Persistence (Fase 1)

La landing está construida. El siguiente bloque de trabajo es **Fase 1: Auth + Supabase**, porque sin cuentas de usuario no hay forma de cobrar ni de guardar datos por persona.

### Orden recomendado

1. **Terminar y deployar la landing** — subir a Vercel, conectar dominio, enchufar Early Access a Resend o Supabase para capturar emails reales.
2. **Crear proyecto Supabase** — definir schema SQL, habilitar Auth.
3. **Login / Registro en la app** — pantalla de auth antes de acceder a la herramienta.
4. **Migrar stores de localStorage → Supabase** — los datos persisten en la nube, el usuario puede entrar desde cualquier dispositivo.
5. **Emails transaccionales con Resend** — bienvenida, verificación, reset.
6. **Fase 2: Stripe** — solo tiene sentido integrarlo cuando ya hay usuarios reales y Auth funcionando.

> La regla es: primero usuarios → después cobrarles. No al revés.
