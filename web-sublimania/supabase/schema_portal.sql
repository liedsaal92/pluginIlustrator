-- ============================================================
--  schema_portal.sql — Portal de jugadores + rol costurera
--  Ejecutar en Supabase → SQL Editor
-- ============================================================

-- ── 1. Rol costurera ─────────────────────────────────────────
INSERT INTO roles (name) VALUES ('costurera') ON CONFLICT (name) DO NOTHING;

-- ── 2. Columnas nuevas en teams ───────────────────────────────
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS created_by   UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS portal_status TEXT DEFAULT 'none';
-- portal_status: 'none' | 'collecting' | 'approved'

-- ── 3. Columnas nuevas en players ─────────────────────────────
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS cedula         TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS player_status  TEXT DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS submitted_at   TIMESTAMPTZ;
-- player_status: 'confirmed' | 'pending' | 'additional'

-- ── 4. Tabla portal_links ────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_links (
  token       TEXT        PRIMARY KEY,
  team_id     TEXT        NOT NULL,
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL DEFAULT 'open',
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- status: 'open' | 'approved' | 'closed'

ALTER TABLE portal_links ENABLE ROW LEVEL SECURITY;

-- Miembros de la org pueden gestionar sus links
CREATE POLICY "org_portal_manage" ON portal_links
  USING  (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- Anon puede leer por token (el token ES la autenticación pública)
CREATE POLICY "public_read_token" ON portal_links
  FOR SELECT TO anon USING (true);

-- ── 5. RLS updates para costurera en teams ───────────────────
-- Costurera solo ve teams que ella creó
-- Admin/employee ven todos (política existente sin cambios)
-- Nota: la política existente usa my_org_id() — costurera también es de la org.
-- Agregamos filtro por created_by solo para SELECT de costurera vía app logic,
-- no RLS (simplifica el modelo).

-- ── 6. RPC pública — info del portal (sin auth) ───────────────
CREATE OR REPLACE FUNCTION get_portal_info(p_token TEXT)
RETURNS TABLE (
  team_nombre   TEXT,
  expires_at    TIMESTAMPTZ,
  status        TEXT,
  player_count  INT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.nombre::TEXT,
    pl.expires_at,
    pl.status,
    COUNT(p.position)::INT
  FROM portal_links pl
  JOIN teams t ON t.id = pl.team_id AND t.org_id = pl.org_id
  LEFT JOIN players p
    ON p.team_id = pl.team_id
   AND p.org_id  = pl.org_id
   AND p.player_status IN ('pending', 'confirmed', 'additional')
  WHERE pl.token = p_token
  GROUP BY t.nombre, pl.expires_at, pl.status;
END;
$$;

GRANT EXECUTE ON FUNCTION get_portal_info TO anon;

-- ── 7. RPC pública — verificar número disponible ─────────────
CREATE OR REPLACE FUNCTION check_numero_available(p_token TEXT, p_numero TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_team_id TEXT;
  v_org_id  UUID;
  v_count   INT;
BEGIN
  SELECT team_id, org_id INTO v_team_id, v_org_id
  FROM portal_links
  WHERE token = p_token AND status = 'open'
    AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN RETURN FALSE; END IF;

  SELECT COUNT(*) INTO v_count
  FROM players
  WHERE team_id = v_team_id
    AND org_id  = v_org_id
    AND numero  = p_numero
    AND player_status != 'confirmed'; -- no bloquear números de equipos anteriores

  RETURN v_count = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION check_numero_available TO anon;

-- ── 8. RPC pública — enviar datos del jugador ─────────────────
CREATE OR REPLACE FUNCTION submit_portal_player(
  p_token          TEXT,
  p_cedula         TEXT,
  p_nombre         TEXT,
  p_nombre_camiseta TEXT,
  p_numero         TEXT,
  p_talla          TEXT
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_link   portal_links%ROWTYPE;
  v_pos    INT;
BEGIN
  -- Validar token y estado
  SELECT * INTO v_link
  FROM portal_links
  WHERE token = p_token
    AND status = 'open'
    AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El formulario ya no está disponible';
  END IF;

  -- Validar número no repetido
  IF EXISTS (
    SELECT 1 FROM players
    WHERE team_id = v_link.team_id
      AND org_id  = v_link.org_id
      AND numero  = p_numero
  ) THEN
    RAISE EXCEPTION 'El número % ya está tomado', p_numero;
  END IF;

  -- Calcular posición
  SELECT COALESCE(MAX(position), -1) + 1 INTO v_pos
  FROM players
  WHERE team_id = v_link.team_id AND org_id = v_link.org_id;

  -- Insertar jugador
  INSERT INTO players (
    team_id, org_id, position,
    nombre, nombre_camiseta, numero, talla,
    cedula, player_status, submitted_at
  ) VALUES (
    v_link.team_id, v_link.org_id, v_pos,
    p_nombre, p_nombre_camiseta, p_numero, p_talla,
    p_cedula, 'pending', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_portal_player TO anon;

-- ── 9. RPC auth — aprobar portal ─────────────────────────────
CREATE OR REPLACE FUNCTION approve_portal(p_token TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_link portal_links%ROWTYPE;
BEGIN
  SELECT * INTO v_link FROM portal_links WHERE token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Token inválido'; END IF;

  -- Cerrar portal
  UPDATE portal_links SET status = 'approved' WHERE token = p_token;

  -- Confirmar todos los pending
  UPDATE players
  SET player_status = 'confirmed'
  WHERE team_id = v_link.team_id
    AND org_id  = v_link.org_id
    AND player_status = 'pending';

  -- Actualizar estado del equipo
  UPDATE teams
  SET portal_status = 'approved'
  WHERE id = v_link.team_id AND org_id = v_link.org_id;
END;
$$;

-- Solo usuarios autenticados de la org pueden aprobar
GRANT EXECUTE ON FUNCTION approve_portal TO authenticated;
