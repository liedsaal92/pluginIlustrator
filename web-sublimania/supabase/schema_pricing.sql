-- ============================================================
--  supabase/schema_pricing.sql — Tablas del cotizador / precios
--  Ejecutar en: Supabase Dashboard → SQL Editor
--
--  Requiere que schema.sql (auth/orgs) ya esté ejecutado.
--  Toda tabla tiene org_id para aislamiento multi-tenant + RLS.
-- ============================================================

-- ── pricing_config ────────────────────────────────────────────
-- Una fila por org. PricingConfig completo como JSONB + refs UI.
CREATE TABLE public.pricing_config (
  org_id              UUID        PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  config              JSONB       NOT NULL DEFAULT '{}',
  ref_cliente_id      TEXT,
  ref_gender          TEXT,
  ref_cliente_id_pant TEXT,
  ref_gender_pant     TEXT,
  ref_molde_id_pant   TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migración para orgs existentes (ejecutar si la tabla ya existe):
-- ALTER TABLE public.pricing_config ADD COLUMN IF NOT EXISTS ref_cliente_id_pant TEXT;
-- ALTER TABLE public.pricing_config ADD COLUMN IF NOT EXISTS ref_gender_pant TEXT;
-- ALTER TABLE public.pricing_config ADD COLUMN IF NOT EXISTS ref_molde_id_pant TEXT;

ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_config: org isolation"
  ON public.pricing_config FOR ALL
  USING (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── pricing_base_prices ───────────────────────────────────────
-- Precios base por modo de servicio × segmento × género × talla.
-- service_mode: 'parcial' (sublimación) | 'completo' (servicio completo)
CREATE TABLE public.pricing_base_prices (
  org_id       UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_mode TEXT    NOT NULL,
  segment      TEXT    NOT NULL,
  gender       TEXT    NOT NULL,
  size         INTEGER NOT NULL,
  camiseta     NUMERIC NOT NULL DEFAULT 0,
  pantaloneta  NUMERIC NOT NULL DEFAULT 0,
  equipo       NUMERIC NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, service_mode, segment, gender, size)
);

ALTER TABLE public.pricing_base_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_base_prices: org isolation"
  ON public.pricing_base_prices FOR ALL
  USING (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

CREATE INDEX ON public.pricing_base_prices (org_id, service_mode);

-- ── pricing_supplies ──────────────────────────────────────────
CREATE TABLE public.pricing_supplies (
  id               TEXT    NOT NULL,
  org_id           UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name             TEXT    NOT NULL DEFAULT '',
  total_cost       NUMERIC NOT NULL DEFAULT 0,
  quantity         NUMERIC NOT NULL DEFAULT 1,
  unit             TEXT    NOT NULL DEFAULT '',
  apply_ink_factor BOOLEAN NOT NULL DEFAULT false,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id, org_id)
);

ALTER TABLE public.pricing_supplies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_supplies: org isolation"
  ON public.pricing_supplies FOR ALL
  USING (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── pricing_machines ──────────────────────────────────────────
CREATE TABLE public.pricing_machines (
  id          TEXT    NOT NULL,
  org_id      UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL DEFAULT '',
  cost        NUMERIC NOT NULL DEFAULT 0,
  life_meters NUMERIC NOT NULL DEFAULT 1000,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id, org_id)
);

ALTER TABLE public.pricing_machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_machines: org isolation"
  ON public.pricing_machines FOR ALL
  USING (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── pricing_operations ────────────────────────────────────────
CREATE TABLE public.pricing_operations (
  id           TEXT    NOT NULL,
  org_id       UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL DEFAULT '',
  monthly_cost NUMERIC NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id, org_id)
);

ALTER TABLE public.pricing_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_operations: org isolation"
  ON public.pricing_operations FOR ALL
  USING (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── pricing_fabrics ───────────────────────────────────────────
CREATE TABLE public.pricing_fabrics (
  id            TEXT    NOT NULL,
  org_id        UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name          TEXT    NOT NULL DEFAULT '',
  cost_per_kg   NUMERIC NOT NULL DEFAULT 0,
  meters_per_kg NUMERIC NOT NULL DEFAULT 1,
  tubular       BOOLEAN NOT NULL DEFAULT false,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id, org_id)
);

ALTER TABLE public.pricing_fabrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_fabrics: org isolation"
  ON public.pricing_fabrics FOR ALL
  USING (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── pricing_volume_tiers ──────────────────────────────────────
-- Record<ProductId, VolumeTier[]> aplanado con product_id.
-- tier_from/tier_to en lugar de from/to (from es reservado en SQL).
CREATE TABLE public.pricing_volume_tiers (
  id         TEXT    NOT NULL,
  org_id     UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id TEXT    NOT NULL,
  tier_from  INTEGER NOT NULL DEFAULT 0,
  tier_to    INTEGER,
  discount   NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id, org_id)
);

ALTER TABLE public.pricing_volume_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_volume_tiers: org isolation"
  ON public.pricing_volume_tiers FOR ALL
  USING (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

CREATE INDEX ON public.pricing_volume_tiers (org_id, product_id);

-- ── pricing_competitors ───────────────────────────────────────
-- prices es JSONB: Partial<Record<MarketProductId, number>>
CREATE TABLE public.pricing_competitors (
  id         TEXT    NOT NULL,
  org_id     UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL DEFAULT '',
  prices     JSONB   NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id, org_id)
);

ALTER TABLE public.pricing_competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_competitors: org isolation"
  ON public.pricing_competitors FOR ALL
  USING (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── pricing_print_profiles ────────────────────────────────────
CREATE TABLE public.pricing_print_profiles (
  id         TEXT    NOT NULL,
  org_id     UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL DEFAULT '',
  ink_factor NUMERIC NOT NULL DEFAULT 1,
  enabled    BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id, org_id)
);

ALTER TABLE public.pricing_print_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_print_profiles: org isolation"
  ON public.pricing_print_profiles FOR ALL
  USING (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── pricing_cm_price_tiers ────────────────────────────────────
-- Unifica cm_price_tiers (embroidery) + paper_price_tiers (paper).
-- tier_type: 'embroidery' | 'paper'
CREATE TABLE public.pricing_cm_price_tiers (
  id         TEXT    NOT NULL,
  org_id     UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tier_type  TEXT    NOT NULL,
  max_cm     NUMERIC NOT NULL DEFAULT 0,
  price      NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id, org_id, tier_type)
);

ALTER TABLE public.pricing_cm_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_cm_price_tiers: org isolation"
  ON public.pricing_cm_price_tiers FOR ALL
  USING (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

CREATE INDEX ON public.pricing_cm_price_tiers (org_id, tier_type);

-- ── pricing_quote_history ─────────────────────────────────────
-- Historial de quotes rápidas. Sin límite (antes cap 80 en localStorage).
-- data JSONB = QuoteHistoryEntry completo.
CREATE TABLE public.pricing_quote_history (
  id         TEXT        NOT NULL,
  org_id     UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data       JSONB       NOT NULL,
  PRIMARY KEY (id, org_id)
);

ALTER TABLE public.pricing_quote_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_quote_history: org isolation"
  ON public.pricing_quote_history FOR ALL
  USING (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

CREATE INDEX ON public.pricing_quote_history (org_id, created_at DESC);

-- ── pricing_cotizaciones ──────────────────────────────────────
-- Cotizaciones guardadas. Sin límite (antes cap 50 en localStorage).
-- Cols queryables para búsquedas + data JSONB completo.
CREATE TABLE public.pricing_cotizaciones (
  id             TEXT        NOT NULL,
  org_id         UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  cliente_nombre TEXT,
  org_nombre     TEXT,
  service_mode   TEXT,
  total_units    INTEGER,
  total_price    NUMERIC,
  total_profit   NUMERIC,
  overall_margin NUMERIC,
  data           JSONB       NOT NULL,
  PRIMARY KEY (id, org_id)
);

ALTER TABLE public.pricing_cotizaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_cotizaciones: org isolation"
  ON public.pricing_cotizaciones FOR ALL
  USING (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

CREATE INDEX ON public.pricing_cotizaciones (org_id, created_at DESC);

-- ── pricing_tabla_exports ─────────────────────────────────────
-- Tablas de precios exportadas. Sin límite (antes cap 50 en localStorage).
CREATE TABLE public.pricing_tabla_exports (
  id             TEXT        NOT NULL,
  org_id         UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  cliente_id     TEXT,
  cliente_nombre TEXT,
  segment        TEXT,
  profile_id     TEXT,
  profile_name   TEXT,
  data           JSONB       NOT NULL,
  PRIMARY KEY (id, org_id)
);

ALTER TABLE public.pricing_tabla_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_tabla_exports: org isolation"
  ON public.pricing_tabla_exports FOR ALL
  USING (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

CREATE INDEX ON public.pricing_tabla_exports (org_id, created_at DESC);

-- ── pricing_tipos_cliente ─────────────────────────────────────
-- Tipos de cliente por org (antes subliflow_tipos_cliente).
CREATE TABLE public.pricing_tipos_cliente (
  id         TEXT NOT NULL,
  org_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nombre     TEXT NOT NULL,
  segmento   TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id, org_id)
);

ALTER TABLE public.pricing_tipos_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_tipos_cliente: org isolation"
  ON public.pricing_tipos_cliente FOR ALL
  USING (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());

-- ── pricing_cliente_tipos ─────────────────────────────────────
-- Asignaciones cliente → tipo (antes subliflow_cliente_tipos).
CREATE TABLE public.pricing_cliente_tipos (
  cliente_id TEXT NOT NULL,
  org_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tipo_id    TEXT NOT NULL,
  PRIMARY KEY (cliente_id, org_id)
);

ALTER TABLE public.pricing_cliente_tipos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_cliente_tipos: org isolation"
  ON public.pricing_cliente_tipos FOR ALL
  USING (org_id = my_org_id())
  WITH CHECK (org_id = my_org_id());
