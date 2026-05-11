// ============================================================
//  utils/pricingMigration.ts — Migración localStorage → Supabase
//
//  Todas las operaciones usan UPSERT → idempotente, se puede
//  ejecutar varias veces sin duplicar datos.
// ============================================================
import { supabase } from './supabase';

const LS_KEYS = [
  'subliflow_pricing_config',
  'subliflow_pricing_history',
  'subliflow_tabla_exports',
  'subliflow_pricing_base_prices',
  'subliflow_pricing_base_prices_completo',
  'subliflow_pricing_supplies',
  'subliflow_pricing_machines',
  'subliflow_pricing_operations',
  'subliflow_pricing_volume_tiers_v2',
  'subliflow_pricing_fabrics',
  'subliflow_pricing_competitors',
  'subliflow_pricing_cm_price_tiers',
  'subliflow_pricing_paper_price_tiers',
  'subliflow_pricing_print_profiles',
  'subliflow_cotizaciones',
  'subliflow_pricing_ref_cliente',
  'subliflow_pricing_ref_gender',
  'subliflow_tipos_cliente',
  'subliflow_cliente_tipos',
] as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export interface MigrationResult {
  success: boolean;
  errors: string[];
  counts: Record<string, number>;
}

export function hasLocalStoragePricingData(): boolean {
  return LS_KEYS.some(key => localStorage.getItem(key) !== null);
}

export function clearLocalStoragePricingData(): void {
  LS_KEYS.forEach(key => localStorage.removeItem(key));
}

export async function migratePricingFromLocalStorage(
  orgId: string,
  onProgress?: (step: string, done: number, total: number) => void,
): Promise<MigrationResult> {
  const errors: string[] = [];
  const counts: Record<string, number> = {};
  const TOTAL_STEPS = 17;
  let step = 0;

  function progress(label: string) {
    step++;
    onProgress?.(label, step, TOTAL_STEPS);
  }

  async function upsert(table: string, rows: object[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await supabase.from(table).upsert(rows as never[]);
    if (error) errors.push(`${table}: ${error.message}`);
  }

  // ── 1. Config ─────────────────────────────────────────────────
  progress('Configuración general');
  const config = readJson<object | null>('subliflow_pricing_config', null);
  const refClienteId = localStorage.getItem('subliflow_pricing_ref_cliente') ?? null;
  const refGender    = localStorage.getItem('subliflow_pricing_ref_gender') ?? null;
  if (config) {
    await upsert('pricing_config', [{
      org_id: orgId, config, ref_cliente_id: refClienteId,
      ref_gender: refGender, updated_at: new Date().toISOString(),
    }]);
    counts.config = 1;
  }

  // ── 2. Precios base parcial ───────────────────────────────────
  progress('Precios base — sublimación');
  const basePrices = readJson<Record<string, unknown>[]>('subliflow_pricing_base_prices', []);
  if (basePrices.length > 0) {
    await upsert('pricing_base_prices', basePrices.map(r => ({
      org_id: orgId, service_mode: 'parcial',
      segment: r.segment, gender: r.gender, size: r.size,
      camiseta: r.camiseta ?? 0, pantaloneta: r.pantaloneta ?? 0, equipo: r.equipo ?? 0,
    })));
    counts.basePrices = basePrices.length;
  }

  // ── 3. Precios base completo ──────────────────────────────────
  progress('Precios base — servicio completo');
  const basePricesCompleto = readJson<Record<string, unknown>[]>('subliflow_pricing_base_prices_completo', []);
  if (basePricesCompleto.length > 0) {
    await upsert('pricing_base_prices', basePricesCompleto.map(r => ({
      org_id: orgId, service_mode: 'completo',
      segment: r.segment, gender: r.gender, size: r.size,
      camiseta: r.camiseta ?? 0, pantaloneta: r.pantaloneta ?? 0, equipo: r.equipo ?? 0,
    })));
    counts.basePricesCompleto = basePricesCompleto.length;
  }

  // ── 4. Insumos ────────────────────────────────────────────────
  progress('Insumos');
  const supplies = readJson<Record<string, unknown>[]>('subliflow_pricing_supplies', []);
  if (supplies.length > 0) {
    await upsert('pricing_supplies', supplies.map((s, i) => ({
      id: s.id, org_id: orgId, name: s.name,
      total_cost: s.totalCost ?? 0, quantity: s.quantity ?? 1,
      unit: s.unit ?? '', apply_ink_factor: s.applyInkFactor ?? false, sort_order: i,
    })));
    counts.supplies = supplies.length;
  }

  // ── 5. Equipos / máquinas ─────────────────────────────────────
  progress('Equipos');
  const machines = readJson<Record<string, unknown>[]>('subliflow_pricing_machines', []);
  if (machines.length > 0) {
    await upsert('pricing_machines', machines.map((m, i) => ({
      id: m.id, org_id: orgId, name: m.name,
      cost: m.cost ?? 0, life_meters: m.lifeMeters ?? 1000, sort_order: i,
    })));
    counts.machines = machines.length;
  }

  // ── 6. Costos operacionales ───────────────────────────────────
  progress('Costos operacionales');
  const operations = readJson<Record<string, unknown>[]>('subliflow_pricing_operations', []);
  if (operations.length > 0) {
    await upsert('pricing_operations', operations.map((o, i) => ({
      id: o.id, org_id: orgId, name: o.name,
      monthly_cost: o.monthlyCost ?? 0, sort_order: i,
    })));
    counts.operations = operations.length;
  }

  // ── 7. Telas ──────────────────────────────────────────────────
  progress('Telas');
  const fabrics = readJson<Record<string, unknown>[]>('subliflow_pricing_fabrics', []);
  if (fabrics.length > 0) {
    await upsert('pricing_fabrics', fabrics.map((f, i) => ({
      id: f.id, org_id: orgId, name: f.name,
      cost_per_kg: f.costPerKg ?? 0, meters_per_kg: f.metersPerKg ?? 1,
      tubular: f.tubular ?? false, sort_order: i,
    })));
    counts.fabrics = fabrics.length;
  }

  // ── 8. Descuentos por volumen ─────────────────────────────────
  progress('Descuentos por volumen');
  const volumeTiers = readJson<Record<string, Record<string, unknown>[]>>('subliflow_pricing_volume_tiers_v2', {});
  const tierRows = Object.entries(volumeTiers).flatMap(([productId, tiers]) =>
    tiers.map((t, i) => ({
      id: t.id, org_id: orgId, product_id: productId,
      tier_from: t.from ?? 0, tier_to: t.to ?? null,
      discount: t.discount ?? 0, sort_order: i,
    }))
  );
  if (tierRows.length > 0) {
    await upsert('pricing_volume_tiers', tierRows);
    counts.volumeTiers = tierRows.length;
  }

  // ── 9. Competidores ───────────────────────────────────────────
  progress('Competidores');
  const competitors = readJson<Record<string, unknown>[]>('subliflow_pricing_competitors', []);
  if (competitors.length > 0) {
    await upsert('pricing_competitors', competitors.map((c, i) => ({
      id: c.id, org_id: orgId, name: c.name, prices: c.prices ?? {}, sort_order: i,
    })));
    counts.competitors = competitors.length;
  }

  // ── 10. Perfiles de impresión ─────────────────────────────────
  progress('Perfiles de impresión');
  const profiles = readJson<Record<string, unknown>[]>('subliflow_pricing_print_profiles', []);
  if (profiles.length > 0) {
    await upsert('pricing_print_profiles', profiles.map((p, i) => ({
      id: p.id, org_id: orgId, name: p.name,
      ink_factor: p.inkFactor ?? 1, enabled: p.enabled ?? true, sort_order: i,
    })));
    counts.printProfiles = profiles.length;
  }

  // ── 11. Tiers bordado ─────────────────────────────────────────
  progress('Tiers bordado por cm');
  const cmTiers = readJson<Record<string, unknown>[]>('subliflow_pricing_cm_price_tiers', []);
  if (cmTiers.length > 0) {
    await upsert('pricing_cm_price_tiers', cmTiers.map((t, i) => ({
      id: t.id, org_id: orgId, tier_type: 'embroidery',
      max_cm: t.maxCm ?? 0, price: t.price ?? 0, sort_order: i,
    })));
    counts.cmTiers = cmTiers.length;
  }

  // ── 12. Tiers papel ───────────────────────────────────────────
  progress('Tiers papel por cm');
  const paperTiers = readJson<Record<string, unknown>[]>('subliflow_pricing_paper_price_tiers', []);
  if (paperTiers.length > 0) {
    await upsert('pricing_cm_price_tiers', paperTiers.map((t, i) => ({
      id: t.id, org_id: orgId, tier_type: 'paper',
      max_cm: t.maxCm ?? 0, price: t.price ?? 0, sort_order: i,
    })));
    counts.paperTiers = paperTiers.length;
  }

  // ── 13. Historial de quotes rápidas ───────────────────────────
  progress('Historial de quotes');
  const history = readJson<Record<string, unknown>[]>('subliflow_pricing_history', []);
  if (history.length > 0) {
    await upsert('pricing_quote_history', history.map(e => ({
      id: e.id, org_id: orgId, created_at: e.createdAt, data: e,
    })));
    counts.quoteHistory = history.length;
  }

  // ── 14. Cotizaciones guardadas ────────────────────────────────
  progress('Cotizaciones guardadas');
  const cotizaciones = readJson<Record<string, unknown>[]>('subliflow_cotizaciones', []);
  if (cotizaciones.length > 0) {
    await upsert('pricing_cotizaciones', cotizaciones.map(e => ({
      id: e.id, org_id: orgId, created_at: e.createdAt,
      cliente_nombre: e.clienteNombre, org_nombre: e.orgNombre,
      service_mode: e.serviceMode, total_units: e.totalUnits,
      total_price: e.totalPrice, total_profit: e.totalProfit,
      overall_margin: e.overallMargin, data: e,
    })));
    counts.cotizaciones = cotizaciones.length;
  }

  // ── 15. Tablas exportadas ─────────────────────────────────────
  progress('Tablas de precios exportadas');
  const tablaExports = readJson<Record<string, unknown>[]>('subliflow_tabla_exports', []);
  if (tablaExports.length > 0) {
    await upsert('pricing_tabla_exports', tablaExports.map(e => ({
      id: e.id, org_id: orgId, created_at: e.createdAt,
      cliente_id: e.clienteId, cliente_nombre: e.clienteNombre,
      segment: e.segment, profile_id: e.profileId, profile_name: e.profileName,
      data: e,
    })));
    counts.tablaExports = tablaExports.length;
  }

  // ── 16. Tipos de cliente ──────────────────────────────────────
  progress('Tipos de cliente');
  const tipos = readJson<Record<string, unknown>[]>('subliflow_tipos_cliente', []);
  if (tipos.length > 0) {
    await upsert('pricing_tipos_cliente', tipos.map((t, i) => ({
      id: t.id, org_id: orgId, nombre: t.nombre, segmento: t.segmento, sort_order: i,
    })));
    counts.tiposCliente = tipos.length;
  }

  // ── 17. Asignaciones cliente → tipo ──────────────────────────
  progress('Asignaciones de tipo de cliente');
  const clienteTipos = readJson<Record<string, string>>('subliflow_cliente_tipos', {});
  const assignRows = Object.entries(clienteTipos).map(([clienteId, tipoId]) => ({
    cliente_id: clienteId, org_id: orgId, tipo_id: tipoId,
  }));
  if (assignRows.length > 0) {
    await upsert('pricing_cliente_tipos', assignRows);
    counts.clienteTipos = assignRows.length;
  }

  return { success: errors.length === 0, errors, counts };
}
