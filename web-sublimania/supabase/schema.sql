-- ============================================================
--  supabase/schema.sql — Esquema multi-tenant (SaaS)
--  Ejecutar en: Supabase Dashboard → SQL Editor
--
--  Modelo de tenancy:
--    organization = empresa suscriptora (tenant)
--    users        = miembros de la org
--    El primer usuario que se registra crea su org y es admin.
--    Los siguientes usuarios son invitados por el admin.
--
--  Flujo de registro:
--    1. supabase.auth.signUp()
--    2. Llamar RPC: select register_org(nombre, org_name)
--
--  Flujo de invitación:
--    1. Admin crea invite → RPC: select create_invite(email, role_name)
--    2. Usuario recibe link con token
--    3. supabase.auth.signUp()
--    4. Llamar RPC: select accept_invite(token, nombre)
-- ============================================================

-- ── EXTENSIONES ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── TABLA: organizations (tenants) ───────────────────────────
-- Cada organización es una empresa que suscribe al SaaS.
-- Todo dato (equipos, clientes, configuración) se scopa a org_id.
CREATE TABLE public.organizations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  slug          TEXT        NOT NULL UNIQUE,   -- identificador URL-friendly
  plan          TEXT        NOT NULL DEFAULT 'trial'
                              CHECK (plan IN ('trial','starter','pro','enterprise')),
  plan_status   TEXT        NOT NULL DEFAULT 'active'
                              CHECK (plan_status IN ('active','suspended','cancelled')),
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── TABLA: users (extiende auth.users, scoped a org) ─────────
CREATE TABLE public.users (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id     UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  nombre     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── TABLA: roles ─────────────────────────────────────────────
CREATE TABLE public.roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,   -- 'admin' | 'employee'
  description TEXT
);

-- ── TABLA: permissions ───────────────────────────────────────
CREATE TABLE public.permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT
);

-- ── TABLA: user_roles ────────────────────────────────────────
CREATE TABLE public.user_roles (
  user_id     UUID        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  role_id     UUID        NOT NULL REFERENCES public.roles(id)  ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- ── TABLA: role_permissions ──────────────────────────────────
CREATE TABLE public.role_permissions (
  role_id       UUID NOT NULL REFERENCES public.roles(id)       ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ── TABLA: invites ────────────────────────────────────────────
-- Admin invita empleados a su org. Registro abierto solo para
-- crear nueva org. Los empleados siempre entran por invite.
CREATE TABLE public.invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  role_id     UUID        NOT NULL REFERENCES public.roles(id),
  token       TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  UUID        NOT NULL REFERENCES public.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── SEED: roles ───────────────────────────────────────────────
INSERT INTO public.roles (name, description) VALUES
  ('admin',    'Administrador con acceso completo a la organización'),
  ('employee', 'Empleado con acceso operativo limitado');

-- ── SEED: permissions ─────────────────────────────────────────
INSERT INTO public.permissions (name, description) VALUES
  ('teams:read',      'Ver equipos'),
  ('teams:write',     'Crear y editar equipos'),
  ('settings:manage', 'Gestionar configuración del sistema'),
  ('users:manage',    'Gestionar usuarios y roles de la organización'),
  ('export:run',      'Exportar CSV para producción'),
  ('billing:manage',  'Gestionar plan y suscripción');

-- ── SEED: role_permissions ────────────────────────────────────
-- Admin: todos los permisos
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'admin';

-- Employee: solo operar (sin admin ni billing)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'employee'
  AND p.name IN ('teams:read', 'teams:write', 'export:run');

-- ── HELPERS ───────────────────────────────────────────────────

-- Retorna el org_id del usuario autenticado actual
CREATE OR REPLACE FUNCTION public.my_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid();
$$;

-- ¿El usuario actual es admin de su org?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  );
$$;

-- Genera slug a partir de nombre de org (minúsculas, sin espacios)
CREATE OR REPLACE FUNCTION public.slugify(text TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(regexp_replace(trim($1), '[^a-zA-Z0-9]+', '-', 'g'));
$$;

-- ── RPC: register_org ─────────────────────────────────────────
-- Llamar inmediatamente después de supabase.auth.signUp().
-- Crea la organización y el perfil del primer admin.
CREATE OR REPLACE FUNCTION public.register_org(
  p_nombre   TEXT,
  p_org_name TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id  UUID := auth.uid();
  v_org_id   UUID;
  v_slug     TEXT;
  v_admin_id UUID;
  v_suffix   INT := 0;
  v_base_slug TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Verificar que el usuario no tenga perfil ya
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'El usuario ya tiene una organización asignada';
  END IF;

  -- Generar slug único
  v_base_slug := public.slugify(p_org_name);
  v_slug := v_base_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix;
  END LOOP;

  -- Crear organización
  INSERT INTO public.organizations (name, slug)
  VALUES (trim(p_org_name), v_slug)
  RETURNING id INTO v_org_id;

  -- Crear perfil de usuario
  INSERT INTO public.users (id, org_id, email, nombre)
  VALUES (
    v_user_id,
    v_org_id,
    (SELECT email FROM auth.users WHERE id = v_user_id),
    trim(p_nombre)
  );

  -- Asignar rol admin
  SELECT id INTO v_admin_id FROM public.roles WHERE name = 'admin';
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (v_user_id, v_admin_id);

  RETURN jsonb_build_object(
    'org_id',   v_org_id,
    'org_name', p_org_name,
    'org_slug', v_slug,
    'role',     'admin'
  );
END;
$$;

-- ── RPC: accept_invite ────────────────────────────────────────
-- Llamar inmediatamente después de supabase.auth.signUp()
-- usando el token del link de invitación.
CREATE OR REPLACE FUNCTION public.accept_invite(
  p_token  TEXT,
  p_nombre TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite  public.invites%ROWTYPE;
  v_org     public.organizations%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Verificar que el usuario no tenga perfil ya
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'El usuario ya tiene una organización asignada';
  END IF;

  -- Buscar invite válido
  SELECT * INTO v_invite FROM public.invites
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitación inválida o expirada';
  END IF;

  -- Verificar email coincide
  IF lower(v_invite.email) != lower((SELECT email FROM auth.users WHERE id = v_user_id)) THEN
    RAISE EXCEPTION 'El email no coincide con la invitación';
  END IF;

  -- Obtener org
  SELECT * INTO v_org FROM public.organizations WHERE id = v_invite.org_id;

  -- Crear perfil
  INSERT INTO public.users (id, org_id, email, nombre)
  VALUES (
    v_user_id,
    v_invite.org_id,
    (SELECT email FROM auth.users WHERE id = v_user_id),
    trim(p_nombre)
  );

  -- Asignar rol de la invitación
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (v_user_id, v_invite.role_id);

  -- Marcar invite como aceptado
  UPDATE public.invites SET accepted_at = now() WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'org_id',   v_invite.org_id,
    'org_name', v_org.name,
    'org_slug', v_org.slug,
    'role',     (SELECT name FROM public.roles WHERE id = v_invite.role_id)
  );
END;
$$;

-- ── RPC: create_invite ────────────────────────────────────────
-- Solo admin. Crea un invite para un email con el rol indicado.
CREATE OR REPLACE FUNCTION public.create_invite(
  p_email     TEXT,
  p_role_name TEXT DEFAULT 'employee'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id  UUID;
  v_role_id UUID;
  v_token   TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden invitar usuarios';
  END IF;

  SELECT org_id INTO v_org_id FROM public.users WHERE id = v_user_id;
  SELECT id     INTO v_role_id FROM public.roles WHERE name = p_role_name;

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Rol inválido: %', p_role_name;
  END IF;

  -- Eliminar invites anteriores al mismo email en esta org (si los hay)
  DELETE FROM public.invites
  WHERE org_id = v_org_id AND lower(email) = lower(p_email) AND accepted_at IS NULL;

  -- Crear nuevo invite
  INSERT INTO public.invites (org_id, email, role_id, invited_by)
  VALUES (v_org_id, lower(trim(p_email)), v_role_id, v_user_id)
  RETURNING token INTO v_token;

  RETURN jsonb_build_object('token', v_token, 'email', p_email, 'role', p_role_name);
END;
$$;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE public.organizations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites         ENABLE ROW LEVEL SECURITY;

-- organizations: cada user ve solo su org; admin puede editarla
CREATE POLICY "org_member_select" ON public.organizations
  FOR SELECT USING (id = public.my_org_id());

CREATE POLICY "org_admin_update" ON public.organizations
  FOR UPDATE USING (id = public.my_org_id() AND public.is_admin());

-- users: ver solo los de mi org; admin gestiona todos en su org
CREATE POLICY "users_same_org_select" ON public.users
  FOR SELECT USING (org_id = public.my_org_id());

CREATE POLICY "users_own_update" ON public.users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_admin_all" ON public.users
  FOR ALL USING (org_id = public.my_org_id() AND public.is_admin());

-- roles / permissions / role_permissions: lectura global para autenticados
CREATE POLICY "roles_read"       ON public.roles            FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "permissions_read" ON public.permissions       FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "rp_read"          ON public.role_permissions  FOR SELECT USING (auth.role() = 'authenticated');

-- user_roles: ver mis roles o admin ve todos en su org
CREATE POLICY "ur_own_select" ON public.user_roles
  FOR SELECT USING (
    user_id = auth.uid() OR
    (public.is_admin() AND EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = user_roles.user_id AND u.org_id = public.my_org_id()
    ))
  );

CREATE POLICY "ur_admin_all" ON public.user_roles
  FOR ALL USING (
    public.is_admin() AND EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = user_roles.user_id AND u.org_id = public.my_org_id()
    )
  );

-- invites: admin de la org gestiona invites de su org
CREATE POLICY "invites_admin" ON public.invites
  FOR ALL USING (org_id = public.my_org_id() AND public.is_admin());

-- ── NOTA: tablas futuras de datos ────────────────────────────
-- Cuando se agreguen teams, clientes, tallas_config, etc.,
-- todas deben tener una columna org_id y una RLS policy:
--
--   CREATE POLICY "tenant_isolation" ON public.<table>
--     FOR ALL USING (org_id = public.my_org_id());
--
-- Esto garantiza que cada organización ve solo sus propios datos.
-- ─────────────────────────────────────────────────────────────
