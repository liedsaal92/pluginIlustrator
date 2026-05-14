-- ============================================================
--  supabase/schema_app_data.sql — Tablas de datos de la app
--  Ejecutar en: Supabase Dashboard → SQL Editor
--
--  Requiere que schema.sql (auth/orgs) ya esté ejecutado.
--  Estructura: todo está scoped a org_id para aislamiento multi-tenant.
-- ============================================================

-- ── TABLA: moldes ─────────────────────────────────────────────
-- Tipos de prenda configurables por org (ej: CAMISETA, BUZO)
CREATE TABLE public.moldes (
  id         TEXT        NOT NULL,   -- slug legible (ej: 'camiseta')
  org_id     UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nombre     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, org_id)
);

ALTER TABLE public.moldes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moldes: org isolation"
  ON public.moldes FOR ALL
  USING  (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── TABLA: clientes ───────────────────────────────────────────
-- Costureras / casas costureras por org
CREATE TABLE public.clientes (
  id               TEXT        NOT NULL,   -- uuid generado en el cliente
  org_id           UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nombre           TEXT        NOT NULL,
  casa_costurera   TEXT        NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, org_id)
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes: org isolation"
  ON public.clientes FOR ALL
  USING  (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── TABLA: tallas_config ──────────────────────────────────────
-- Dimensiones por org + cliente + molde + talla
-- Estructura: una fila por combinación (cliente, molde, talla)
CREATE TABLE public.tallas_config (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cliente_id   TEXT        NOT NULL,
  molde_id     TEXT        NOT NULL,
  talla        TEXT        NOT NULL,
  alto         TEXT        NOT NULL DEFAULT '',
  ancho        TEXT        NOT NULL DEFAULT '',
  manga_ancho  TEXT        NOT NULL DEFAULT '',
  manga_alto   TEXT        NOT NULL DEFAULT '',
  UNIQUE (org_id, cliente_id, molde_id, talla)
);

ALTER TABLE public.tallas_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tallas_config: org isolation"
  ON public.tallas_config FOR ALL
  USING  (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── TABLA: teams ──────────────────────────────────────────────
CREATE TABLE public.teams (
  id             TEXT        NOT NULL,   -- uuid generado en el cliente
  org_id         UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nombre         TEXT        NOT NULL DEFAULT '',
  notas          TEXT        NOT NULL DEFAULT '',
  base_team_id   TEXT,                  -- referencia a equipo base (nullable)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, org_id)
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teams: org isolation"
  ON public.teams FOR ALL
  USING  (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── TABLA: players ────────────────────────────────────────────
-- Jugadores de un equipo. position = índice original (para overrides)
CREATE TABLE public.players (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id          TEXT        NOT NULL,
  org_id           UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  position         INTEGER     NOT NULL,  -- índice en el array (para mapear overrides)
  nombre           TEXT        NOT NULL DEFAULT '',
  nombre_camiseta  TEXT        NOT NULL DEFAULT '',
  numero           TEXT        NOT NULL DEFAULT '',
  talla            TEXT        NOT NULL DEFAULT '',
  UNIQUE (team_id, org_id, position)
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players: org isolation"
  ON public.players FOR ALL
  USING  (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── TABLA: talla_rules ────────────────────────────────────────
-- Reglas configuradas por talla dentro de un equipo
-- rules JSONB = { "FRENTE.NOMBRE.pos_x": "8.00", ... }
CREATE TABLE public.talla_rules (
  id       UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id  TEXT  NOT NULL,
  org_id   UUID  NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  talla    TEXT  NOT NULL,
  rules    JSONB NOT NULL DEFAULT '{}',
  UNIQUE (team_id, org_id, talla)
);

ALTER TABLE public.talla_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "talla_rules: org isolation"
  ON public.talla_rules FOR ALL
  USING  (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── TABLA: player_overrides ───────────────────────────────────
-- Overrides individuales por jugador (índice) dentro de un equipo
-- overrides JSONB = { "FRENTE.NOMBRE.pos_x": "10.00", ... }
CREATE TABLE public.player_overrides (
  id             UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id        TEXT     NOT NULL,
  org_id         UUID     NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  player_position INTEGER NOT NULL,   -- coincide con players.position
  overrides      JSONB    NOT NULL DEFAULT '{}',
  UNIQUE (team_id, org_id, player_position)
);

ALTER TABLE public.player_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_overrides: org isolation"
  ON public.player_overrides FOR ALL
  USING  (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── TABLA: export_history ─────────────────────────────────────
CREATE TABLE public.export_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     TEXT        NOT NULL,
  org_id      UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  talla       TEXT        NOT NULL,
  cliente_id  TEXT,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "export_history: org isolation"
  ON public.export_history FOR ALL
  USING  (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── TABLA: tallas_default ────────────────────────────────────
-- Lista de tallas disponibles por org (se usa al inicializar un cliente/molde)
-- Auto-sembrada con TALLAS_DEFAULT la primera vez que se accede.
CREATE TABLE public.tallas_default (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  molde_id    TEXT NOT NULL DEFAULT 'camiseta',
  talla       TEXT NOT NULL,
  alto        TEXT NOT NULL DEFAULT '',
  ancho       TEXT NOT NULL DEFAULT '',
  manga_ancho TEXT NOT NULL DEFAULT '',
  manga_alto  TEXT NOT NULL DEFAULT '',
  orden       INT  NOT NULL DEFAULT 0,
  UNIQUE (org_id, molde_id, talla)
);

ALTER TABLE public.tallas_default ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tallas_default: org isolation"
  ON public.tallas_default FOR ALL
  USING  (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── ÍNDICES de performance ────────────────────────────────────
CREATE INDEX ON public.tallas_default  (org_id, orden);
CREATE INDEX ON public.tallas_config   (org_id, cliente_id, molde_id);
CREATE INDEX ON public.players         (team_id, org_id);
CREATE INDEX ON public.talla_rules     (team_id, org_id);
CREATE INDEX ON public.player_overrides(team_id, org_id);
CREATE INDEX ON public.export_history  (team_id, org_id);
CREATE INDEX ON public.teams           (org_id, updated_at DESC);
