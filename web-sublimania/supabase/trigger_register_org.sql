-- ============================================================
--  Ejecutar en: Supabase Dashboard → SQL Editor
--  Reemplaza el trigger anterior (CREATE OR REPLACE).
--  Si el usuario tiene un invite_token en metadata,
--  el trigger omite crear org — accept_invite RPC lo maneja.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id    UUID;
  v_slug      TEXT;
  v_base_slug TEXT;
  v_suffix    INT := 0;
  v_org_name  TEXT;
  v_nombre    TEXT;
  v_admin_id  UUID;
  v_is_invite BOOLEAN;
BEGIN
  -- Si viene con invite_token, accept_invite RPC crea el perfil
  v_is_invite := (NEW.raw_user_meta_data->>'invite_token') IS NOT NULL;
  IF v_is_invite THEN
    RETURN NEW;
  END IF;

  v_org_name := COALESCE(
    NEW.raw_user_meta_data->>'org_name',
    split_part(NEW.email, '@', 2)
  );
  v_nombre := COALESCE(
    NEW.raw_user_meta_data->>'nombre',
    split_part(NEW.email, '@', 1)
  );

  -- Slug único
  v_base_slug := public.slugify(v_org_name);
  v_slug := v_base_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix;
  END LOOP;

  -- Crear org
  INSERT INTO public.organizations (name, slug)
  VALUES (v_org_name, v_slug)
  RETURNING id INTO v_org_id;

  -- Crear perfil
  INSERT INTO public.users (id, org_id, email, nombre)
  VALUES (NEW.id, v_org_id, NEW.email, v_nombre);

  -- Asignar admin
  SELECT id INTO v_admin_id FROM public.roles WHERE name = 'admin';
  INSERT INTO public.user_roles (user_id, role_id) VALUES (NEW.id, v_admin_id);

  RETURN NEW;
END;
$$;

-- El trigger ya existe (CREATE OR REPLACE solo reemplaza la función)
-- Si es primera vez, crear el trigger también:
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
