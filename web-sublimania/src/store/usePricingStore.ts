// ============================================================
//  store/usePricingStore.ts — Cotizador / precios
//  Backed by Supabase. Optimistic updates — UI responde instantáneo.
//  Llamar init() después de que la sesión esté disponible.
// ============================================================
import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';
import { defaultBasePrices } from '../pricing/data/basePrices';
import { defaultPricingConfig } from '../pricing/data/config';
import { defaultFabrics } from '../pricing/data/fabrics';
import { defaultSupplies } from '../pricing/data/supplies';
import { machines as defaultMachines } from '../pricing/data/machines';
import { operations as defaultOperations } from '../pricing/data/operations';
import { defaultVolumeTiersByProduct } from '../pricing/data/volumeTiers';
import { defaultCompetitors } from '../pricing/data/competitors';
import { defaultPrintProfiles } from '../pricing/data/printProfiles';
import { defaultCmPriceTiers } from '../pricing/data/cmPriceTiers';
import { defaultPaperPriceTiers } from '../pricing/data/paperPriceTiers';
import type {
  BasePrice, BasePriceField, CmPriceTier, Competitor, CotizacionHistoryEntry, CustomerSegment,
  FabricType, Gender, HeatPress, MachineCost, OperationCost, Plotter, PricingConfig, PrintProfile,
  ProductId, QuoteHistoryEntry, QuoteResult, Supply, TablaExportEntry, VolumeTier,
} from '../pricing/types';

// ── Helpers ──────────────────────────────────────────────────

function errToast(label: string, err: unknown) {
  console.error(label, err);
  const msg = (err as { message?: string })?.message ?? String(err);
  useToastStore.getState().push(`Error al guardar: ${msg}`, 'error');
}

function getOrgId(): string {
  const orgId = useAuthStore.getState().session?.user.orgId;
  if (!orgId) throw new Error('No org_id — usuario no autenticado');
  return orgId;
}

function genId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function migrateConfig(raw: PricingConfig): PricingConfig {
  const out = { ...defaultPricingConfig, ...raw };
  const legacy = (raw as unknown as Record<string, unknown>)['defaultSavingsTransferRate'];
  if (typeof legacy === 'number' && !('savingsTransferRateNormal' in raw)) {
    out.savingsTransferRateNormal = legacy;
    out.savingsTransferRateVip = legacy;
  }
  return out;
}

function migrateBasePrices(raw: BasePrice[]): BasePrice[] {
  if (!raw.length) return defaultBasePrices;
  if (!('gender' in raw[0])) {
    return [
      ...raw.map(r => ({ ...r, gender: 'H' as Gender })),
      ...raw.map(r => ({ ...r, gender: 'M' as Gender })),
    ];
  }
  return raw;
}

function migratePrintProfiles(raw: PrintProfile[]): PrintProfile[] {
  if (!raw || !raw.length) return defaultPrintProfiles;
  return raw.map(p => ({ ...p, enabled: p.enabled ?? true }));
}

// Debounce para config (cambia en cada keystroke)
let _configDebounce: ReturnType<typeof setTimeout> | null = null;
let _pendingFlush: (() => void) | null = null;

function scheduleConfigSave(
  orgId: string,
  config: PricingConfig,
  refClienteId: string | null,
  refGender: Gender | null,
  refClienteIdPant: string | null,
  refGenderPant: Gender | null,
  refMoldeIdPant: string | null,
) {
  if (_configDebounce) clearTimeout(_configDebounce);

  _pendingFlush = () => {
    supabase.from('pricing_config').upsert({
      org_id: orgId, config,
      ref_cliente_id: refClienteId, ref_gender: refGender,
      ref_cliente_id_pant: refClienteIdPant,
      ref_gender_pant:     refGenderPant,
      ref_molde_id_pant:   refMoldeIdPant,
      updated_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) errToast('pricing_config.save:', error);
    });
  };

  _configDebounce = setTimeout(() => {
    _pendingFlush?.();
    _pendingFlush = null;
    _configDebounce = null;
  }, 600);
}

window.addEventListener('beforeunload', () => {
  if (_configDebounce && _pendingFlush) {
    clearTimeout(_configDebounce);
    _pendingFlush();
  }
});

// Seed de datos default para orgs nuevas
async function seedDefaults(orgId: string): Promise<void> {
  await Promise.allSettled([
    supabase.from('pricing_config').insert({
      org_id: orgId, config: defaultPricingConfig,
      ref_cliente_id: null, ref_gender: null,
    }),
    supabase.from('pricing_base_prices').insert([
      ...defaultBasePrices.map(r => ({ org_id: orgId, service_mode: 'parcial', segment: r.segment, gender: r.gender, size: r.size, camiseta: r.camiseta, pantaloneta: r.pantaloneta, equipo: r.equipo })),
      ...defaultBasePrices.map(r => ({ org_id: orgId, service_mode: 'completo', segment: r.segment, gender: r.gender, size: r.size, camiseta: r.camiseta, pantaloneta: r.pantaloneta, equipo: r.equipo })),
    ]),
    supabase.from('pricing_supplies').insert(
      defaultSupplies.map((s, i) => ({ id: s.id, org_id: orgId, name: s.name, total_cost: s.totalCost, quantity: s.quantity, unit: s.unit, apply_ink_factor: s.applyInkFactor, sort_order: i }))
    ),
    supabase.from('pricing_machines').insert(
      defaultMachines.map((m, i) => ({ id: m.id, org_id: orgId, name: m.name, cost: m.cost, life_meters: m.lifeMeters, sort_order: i }))
    ),
    supabase.from('pricing_operations').insert(
      defaultOperations.map((o, i) => ({ id: o.id, org_id: orgId, name: o.name, monthly_cost: o.monthlyCost, sort_order: i }))
    ),
    supabase.from('pricing_fabrics').insert(
      defaultFabrics.map((f, i) => ({ id: f.id, org_id: orgId, name: f.name, cost_per_kg: f.costPerKg, meters_per_kg: f.metersPerKg, tubular: f.tubular, sort_order: i }))
    ),
    supabase.from('pricing_volume_tiers').insert(
      Object.entries(defaultVolumeTiersByProduct).flatMap(([productId, tiers]) =>
        tiers.map((t, i) => ({ id: t.id, org_id: orgId, product_id: productId, tier_from: t.from, tier_to: t.to ?? null, discount: t.discount, sort_order: i }))
      )
    ),
    supabase.from('pricing_competitors').insert(
      defaultCompetitors.map((c, i) => ({ id: c.id, org_id: orgId, name: c.name, prices: c.prices, sort_order: i }))
    ),
    supabase.from('pricing_print_profiles').insert(
      defaultPrintProfiles.map((p, i) => ({ id: p.id, org_id: orgId, name: p.name, ink_factor: p.inkFactor, enabled: p.enabled, sort_order: i }))
    ),
    supabase.from('pricing_cm_price_tiers').insert([
      ...defaultCmPriceTiers.map((t, i) => ({ id: t.id, org_id: orgId, tier_type: 'embroidery', max_cm: t.maxCm, price: t.price, sort_order: i })),
      ...defaultPaperPriceTiers.map((t, i) => ({ id: t.id, org_id: orgId, tier_type: 'paper', max_cm: t.maxCm, price: t.price, sort_order: i })),
    ]),
  ]);
}

// Reset a defaults en Supabase (para resetPricingData)
async function resetToDefaults(orgId: string): Promise<void> {
  await supabase.from('pricing_config').upsert({
    org_id: orgId, config: defaultPricingConfig,
    ref_cliente_id: null, ref_gender: null, updated_at: new Date().toISOString(),
  });
  await supabase.from('pricing_base_prices').upsert([
    ...defaultBasePrices.map(r => ({ org_id: orgId, service_mode: 'parcial', segment: r.segment, gender: r.gender, size: r.size, camiseta: r.camiseta, pantaloneta: r.pantaloneta, equipo: r.equipo })),
    ...defaultBasePrices.map(r => ({ org_id: orgId, service_mode: 'completo', segment: r.segment, gender: r.gender, size: r.size, camiseta: r.camiseta, pantaloneta: r.pantaloneta, equipo: r.equipo })),
  ]);
  // Lista: delete all + insert defaults
  const listTables = [
    { table: 'pricing_supplies',      data: defaultSupplies.map((s, i) => ({ id: s.id, org_id: orgId, name: s.name, total_cost: s.totalCost, quantity: s.quantity, unit: s.unit, apply_ink_factor: s.applyInkFactor, sort_order: i })) },
    { table: 'pricing_machines',      data: defaultMachines.map((m, i) => ({ id: m.id, org_id: orgId, name: m.name, cost: m.cost, life_meters: m.lifeMeters, sort_order: i })) },
    { table: 'pricing_operations',    data: defaultOperations.map((o, i) => ({ id: o.id, org_id: orgId, name: o.name, monthly_cost: o.monthlyCost, sort_order: i })) },
    { table: 'pricing_volume_tiers',  data: Object.entries(defaultVolumeTiersByProduct).flatMap(([productId, tiers]) => tiers.map((t, i) => ({ id: t.id, org_id: orgId, product_id: productId, tier_from: t.from, tier_to: t.to ?? null, discount: t.discount, sort_order: i }))) },
    { table: 'pricing_print_profiles', data: defaultPrintProfiles.map((p, i) => ({ id: p.id, org_id: orgId, name: p.name, ink_factor: p.inkFactor, enabled: p.enabled, sort_order: i })) },
  ] as const;
  for (const { table, data } of listTables) {
    await (supabase.from(table as string) as ReturnType<typeof supabase.from>).delete().eq('org_id', orgId);
    if (data.length > 0) await (supabase.from(table as string) as ReturnType<typeof supabase.from>).insert(data as never[]);
  }
}

// ── Interfaz del store ────────────────────────────────────────

interface PricingState {
  loading: boolean;
  config: PricingConfig;
  basePrices: BasePrice[];
  basePricesCompleto: BasePrice[];
  supplies: Supply[];
  machines: MachineCost[];
  operations: OperationCost[];
  history: QuoteHistoryEntry[];
  volumeTiersByProduct: Record<ProductId, VolumeTier[]>;
  fabrics: FabricType[];
  competitors: Competitor[];
  cmPriceTiers: CmPriceTier[];
  paperPriceTiers: CmPriceTier[];
  printProfiles: PrintProfile[];
  refClienteId: string | null;
  refGender: Gender | null;
  tablaExports: TablaExportEntry[];
  cotizaciones: CotizacionHistoryEntry[];

  init: () => Promise<void>;
  updateConfig: <K extends keyof PricingConfig>(key: K, value: PricingConfig[K]) => void;
  flushConfig: () => void;
  updateBasePrice: (segment: CustomerSegment, gender: Gender, size: number, field: BasePriceField, value: number) => void;
  updateBasePriceCompleto: (segment: CustomerSegment, gender: Gender, size: number, field: BasePriceField, value: number) => void;

  updateSupply: (id: string, patch: Partial<Omit<Supply, 'id'>>) => void;
  addSupply: () => void;
  removeSupply: (id: string) => void;

  updateMachine: (id: string, patch: Partial<Omit<MachineCost, 'id'>>) => void;
  addMachine: () => void;
  removeMachine: (id: string) => void;

  updateOperation: (id: string, patch: Partial<Omit<OperationCost, 'id'>>) => void;
  addOperation: () => void;
  removeOperation: (id: string) => void;

  updateVolumeTier: (productId: ProductId, id: string, patch: Partial<Omit<VolumeTier, 'id'>>) => void;
  addVolumeTier: (productId: ProductId) => void;
  removeVolumeTier: (productId: ProductId, id: string) => void;

  updateFabric: (id: string, patch: Partial<Omit<FabricType, 'id'>>) => void;
  addFabric: () => void;
  removeFabric: (id: string) => void;

  updateCompetitor: (id: string, patch: Partial<Omit<Competitor, 'id'>>) => void;
  addCompetitor: () => void;
  removeCompetitor: (id: string) => void;

  updateCmTier: (id: string, patch: Partial<Omit<CmPriceTier, 'id'>>) => void;
  addCmTier: () => void;
  removeCmTier: (id: string) => void;

  updatePaperTier: (id: string, patch: Partial<Omit<CmPriceTier, 'id'>>) => void;
  addPaperTier: () => void;
  removePaperTier: (id: string) => void;

  updatePrintProfile: (id: string, patch: Partial<Omit<PrintProfile, 'id'>>) => void;
  addPrintProfile: () => void;
  removePrintProfile: (id: string) => void;

  updatePress: (id: string, patch: Partial<Omit<HeatPress, 'id'>>) => void;
  addPress: () => void;
  removePress: (id: string) => void;

  updatePlotter: (id: string, patch: Partial<Omit<Plotter, 'id'>>) => void;
  addPlotter: () => void;
  removePlotter: (id: string) => void;

  setRefCliente: (id: string | null) => void;
  setRefGender:  (g: Gender | null) => void;

  refClienteIdPant: string | null;
  refGenderPant:    Gender | null;
  refMoldeIdPant:   string | null;
  setRefClientePant: (id: string | null) => void;
  setRefGenderPant:  (g: Gender | null) => void;
  setRefMoldePant:   (id: string | null) => void;

  resetPricingData: () => void;
  saveQuote: (quote: QuoteResult) => void;
  clearHistory: () => void;

  saveTablaExport: (entry: Omit<TablaExportEntry, 'id' | 'createdAt'>) => void;
  removeTablaExport: (id: string) => void;

  saveCotizacion: (entry: CotizacionHistoryEntry) => void;
  removeCotizacion: (id: string) => void;
}

// ── Store ─────────────────────────────────────────────────────

export const usePricingStore = create<PricingState>()((set, get) => ({
  loading: false,
  config:               defaultPricingConfig,
  basePrices:           defaultBasePrices,
  basePricesCompleto:   defaultBasePrices,
  supplies:             defaultSupplies,
  machines:             defaultMachines,
  operations:           defaultOperations,
  volumeTiersByProduct: defaultVolumeTiersByProduct,
  fabrics:              defaultFabrics,
  competitors:          defaultCompetitors,
  cmPriceTiers:         defaultCmPriceTiers,
  paperPriceTiers:      defaultPaperPriceTiers,
  printProfiles:        defaultPrintProfiles,
  history:              [],
  tablaExports:         [],
  cotizaciones:         [],
  refClienteId:         null,
  refGender:            null,
  refClienteIdPant:     null,
  refGenderPant:        null,
  refMoldeIdPant:       null,

  // ── Carga inicial desde Supabase ─────────────────────────────
  init: async () => {
    const orgId = getOrgId();
    set({ loading: true });

    const [
      configRes, basePricesRes, suppliesRes, machinesRes, opsRes, fabricsRes,
      tiersRes, competitorsRes, profilesRes, cmTiersRes,
      quoteHistRes, cotizacionesRes, tablaExportsRes,
    ] = await Promise.all([
      supabase.from('pricing_config').select('*').eq('org_id', orgId).maybeSingle(),
      supabase.from('pricing_base_prices').select('*').eq('org_id', orgId),
      supabase.from('pricing_supplies').select('*').eq('org_id', orgId).order('sort_order'),
      supabase.from('pricing_machines').select('*').eq('org_id', orgId).order('sort_order'),
      supabase.from('pricing_operations').select('*').eq('org_id', orgId).order('sort_order'),
      supabase.from('pricing_fabrics').select('*').eq('org_id', orgId).order('sort_order'),
      supabase.from('pricing_volume_tiers').select('*').eq('org_id', orgId).order('sort_order'),
      supabase.from('pricing_competitors').select('*').eq('org_id', orgId).order('sort_order'),
      supabase.from('pricing_print_profiles').select('*').eq('org_id', orgId).order('sort_order'),
      supabase.from('pricing_cm_price_tiers').select('*').eq('org_id', orgId).order('sort_order'),
      supabase.from('pricing_quote_history').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
      supabase.from('pricing_cotizaciones').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
      supabase.from('pricing_tabla_exports').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
    ]);

    // Org nueva sin datos → seed defaults y usar estado inicial
    if (!configRes.data) {
      await seedDefaults(orgId);
      set({ loading: false });
      return;
    }

    // Transformar filas DB → tipos del store
    const config = migrateConfig({ ...defaultPricingConfig, ...configRes.data.config, minProfitRatio: 0 });
    const refClienteId     = configRes.data.ref_cliente_id      ?? null;
    const refGender        = (configRes.data.ref_gender as Gender | null) ?? null;
    const refClienteIdPant = configRes.data.ref_cliente_id_pant ?? null;
    const refGenderPant    = (configRes.data.ref_gender_pant as Gender | null) ?? null;
    const refMoldeIdPant   = configRes.data.ref_molde_id_pant   ?? null;

    const allBp = basePricesRes.data ?? [];
    const basePrices = migrateBasePrices(
      allBp.filter(r => r.service_mode === 'parcial').map(r => ({
        segment: r.segment as CustomerSegment, gender: r.gender as Gender, size: r.size,
        camiseta: Number(r.camiseta), pantaloneta: Number(r.pantaloneta), equipo: Number(r.equipo),
      }))
    );
    const basePricesCompleto = migrateBasePrices(
      allBp.filter(r => r.service_mode === 'completo').map(r => ({
        segment: r.segment as CustomerSegment, gender: r.gender as Gender, size: r.size,
        camiseta: Number(r.camiseta), pantaloneta: Number(r.pantaloneta), equipo: Number(r.equipo),
      }))
    );

    const supplies: Supply[] = (suppliesRes.data ?? []).map(r => ({
      id: r.id, name: r.name, totalCost: Number(r.total_cost),
      quantity: Number(r.quantity), unit: r.unit, applyInkFactor: r.apply_ink_factor,
    }));
    const machines: MachineCost[] = (machinesRes.data ?? []).map(r => ({
      id: r.id, name: r.name, cost: Number(r.cost), lifeMeters: Number(r.life_meters),
    }));
    const operations: OperationCost[] = (opsRes.data ?? []).map(r => ({
      id: r.id, name: r.name, monthlyCost: Number(r.monthly_cost),
    }));
    const fabrics: FabricType[] = (fabricsRes.data ?? []).map(r => ({
      id: r.id, name: r.name, costPerKg: Number(r.cost_per_kg),
      metersPerKg: Number(r.meters_per_kg), tubular: r.tubular,
    }));

    // volumeTiersByProduct: agrupar por product_id
    const volumeTiersByProduct = { ...defaultVolumeTiersByProduct } as Record<ProductId, VolumeTier[]>;
    const tierRows = tiersRes.data ?? [];
    if (tierRows.length > 0) {
      const grouped: Record<string, VolumeTier[]> = {};
      for (const r of tierRows) {
        if (!grouped[r.product_id]) grouped[r.product_id] = [];
        grouped[r.product_id].push({ id: r.id, from: r.tier_from, to: r.tier_to, discount: Number(r.discount) });
      }
      for (const productId of Object.keys(grouped) as ProductId[]) {
        volumeTiersByProduct[productId] = grouped[productId];
      }
    }

    const competitors: Competitor[] = (competitorsRes.data ?? []).map(r => ({
      id: r.id, name: r.name, prices: r.prices ?? {},
    }));
    const printProfiles = migratePrintProfiles(
      (profilesRes.data ?? []).map(r => ({
        id: r.id, name: r.name, inkFactor: Number(r.ink_factor), enabled: r.enabled,
      }))
    );

    const allCm = cmTiersRes.data ?? [];
    const cmPriceTiers: CmPriceTier[] = allCm
      .filter(r => r.tier_type === 'embroidery')
      .map(r => ({ id: r.id, maxCm: Number(r.max_cm), price: Number(r.price) }));
    const paperPriceTiers: CmPriceTier[] = allCm
      .filter(r => r.tier_type === 'paper')
      .map(r => ({ id: r.id, maxCm: Number(r.max_cm), price: Number(r.price) }));

    const history: QuoteHistoryEntry[] = (quoteHistRes.data ?? []).map(r => r.data as QuoteHistoryEntry);
    const cotizaciones: CotizacionHistoryEntry[] = (cotizacionesRes.data ?? []).map(r => r.data as CotizacionHistoryEntry);
    const tablaExports: TablaExportEntry[] = (tablaExportsRes.data ?? []).map(r => r.data as TablaExportEntry);

    set({
      loading: false, config, refClienteId, refGender,
      refClienteIdPant, refGenderPant, refMoldeIdPant,
      basePrices, basePricesCompleto, supplies, machines, operations, fabrics,
      volumeTiersByProduct, competitors, printProfiles, cmPriceTiers, paperPriceTiers,
      history, cotizaciones, tablaExports,
    });
  },

  // ── Config ────────────────────────────────────────────────────
  updateConfig: (key, value) => {
    const orgId = getOrgId();
    const { refClienteId, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant } = get();
    const config = { ...get().config, [key]: value };
    set({ config });
    scheduleConfigSave(orgId, config, refClienteId, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant);
  },

  flushConfig: () => {
    if (_configDebounce) { clearTimeout(_configDebounce); _configDebounce = null; }
    if (_pendingFlush) { _pendingFlush(); _pendingFlush = null; }
  },

  // ── Base prices ───────────────────────────────────────────────
  updateBasePrice: (segment, gender, size, field, value) => {
    const orgId = getOrgId();
    const safe = Number.isFinite(value) ? value : 0;
    const basePrices = get().basePrices.map(r =>
      r.segment === segment && r.gender === gender && r.size === size ? { ...r, [field]: safe } : r
    );
    set({ basePrices });
    supabase.from('pricing_base_prices')
      .update({ [field]: safe })
      .eq('org_id', orgId).eq('service_mode', 'parcial')
      .eq('segment', segment).eq('gender', gender).eq('size', size)
      .then(({ error }) => { if (error) errToast('base_prices.update:', error); });
  },

  updateBasePriceCompleto: (segment, gender, size, field, value) => {
    const orgId = getOrgId();
    const safe = Number.isFinite(value) ? value : 0;
    const basePricesCompleto = get().basePricesCompleto.map(r =>
      r.segment === segment && r.gender === gender && r.size === size ? { ...r, [field]: safe } : r
    );
    set({ basePricesCompleto });
    supabase.from('pricing_base_prices')
      .update({ [field]: safe })
      .eq('org_id', orgId).eq('service_mode', 'completo')
      .eq('segment', segment).eq('gender', gender).eq('size', size)
      .then(({ error }) => { if (error) errToast('base_prices_completo.update:', error); });
  },

  // ── Supplies ──────────────────────────────────────────────────
  updateSupply: (id, patch) => {
    const orgId = getOrgId();
    const prev = get().supplies;
    const supplies = prev.map(s => s.id === id ? { ...s, ...patch } : s);
    set({ supplies });
    const dbPatch: Record<string, unknown> = {};
    if (patch.name             !== undefined) dbPatch.name             = patch.name;
    if (patch.totalCost        !== undefined) dbPatch.total_cost       = patch.totalCost;
    if (patch.quantity         !== undefined) dbPatch.quantity         = patch.quantity;
    if (patch.unit             !== undefined) dbPatch.unit             = patch.unit;
    if (patch.applyInkFactor   !== undefined) dbPatch.apply_ink_factor = patch.applyInkFactor;
    supabase.from('pricing_supplies').update(dbPatch).eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { errToast('supplies.update:', error); set({ supplies: prev }); } });
  },
  addSupply: () => {
    const orgId = getOrgId();
    const id = genId();
    const sortOrder = get().supplies.length;
    const item: Supply = { id, name: 'Nuevo insumo', totalCost: 0, quantity: 1, unit: 'm', applyInkFactor: false };
    set(s => ({ supplies: [...s.supplies, item] }));
    supabase.from('pricing_supplies').insert({ id, org_id: orgId, name: item.name, total_cost: 0, quantity: 1, unit: 'm', apply_ink_factor: false, sort_order: sortOrder })
      .then(({ error }) => { if (error) { errToast('supplies.add:', error); set(s => ({ supplies: s.supplies.filter(x => x.id !== id) })); } });
  },
  removeSupply: (id) => {
    const orgId = getOrgId();
    const prev = get().supplies;
    set(s => ({ supplies: s.supplies.filter(x => x.id !== id) }));
    supabase.from('pricing_supplies').delete().eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { errToast('supplies.remove:', error); set({ supplies: prev }); } });
  },

  // ── Machines ──────────────────────────────────────────────────
  updateMachine: (id, patch) => {
    const orgId = getOrgId();
    const prev = get().machines;
    const machines = prev.map(m => m.id === id ? { ...m, ...patch } : m);
    set({ machines });
    const dbPatch: Record<string, unknown> = {};
    if (patch.name        !== undefined) dbPatch.name        = patch.name;
    if (patch.cost        !== undefined) dbPatch.cost        = patch.cost;
    if (patch.lifeMeters  !== undefined) dbPatch.life_meters = patch.lifeMeters;
    supabase.from('pricing_machines').update(dbPatch).eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { errToast('machines.update:', error); set({ machines: prev }); } });
  },
  addMachine: () => {
    const orgId = getOrgId();
    const id = genId();
    const sortOrder = get().machines.length;
    const item: MachineCost = { id, name: 'Nuevo equipo', cost: 0, lifeMeters: 1000 };
    set(s => ({ machines: [...s.machines, item] }));
    supabase.from('pricing_machines').insert({ id, org_id: orgId, name: item.name, cost: 0, life_meters: 1000, sort_order: sortOrder })
      .then(({ error }) => { if (error) { errToast('machines.add:', error); set(s => ({ machines: s.machines.filter(x => x.id !== id) })); } });
  },
  removeMachine: (id) => {
    const orgId = getOrgId();
    const prev = get().machines;
    set(s => ({ machines: s.machines.filter(x => x.id !== id) }));
    supabase.from('pricing_machines').delete().eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { errToast('machines.remove:', error); set({ machines: prev }); } });
  },

  // ── Operations ────────────────────────────────────────────────
  updateOperation: (id, patch) => {
    const orgId = getOrgId();
    const prev = get().operations;
    const operations = prev.map(o => o.id === id ? { ...o, ...patch } : o);
    set({ operations });
    const dbPatch: Record<string, unknown> = {};
    if (patch.name         !== undefined) dbPatch.name         = patch.name;
    if (patch.monthlyCost  !== undefined) dbPatch.monthly_cost = patch.monthlyCost;
    supabase.from('pricing_operations').update(dbPatch).eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { errToast('operations.update:', error); set({ operations: prev }); } });
  },
  addOperation: () => {
    const orgId = getOrgId();
    const id = genId();
    const sortOrder = get().operations.length;
    const item: OperationCost = { id, name: 'Nuevo costo', monthlyCost: 0 };
    set(s => ({ operations: [...s.operations, item] }));
    supabase.from('pricing_operations').insert({ id, org_id: orgId, name: item.name, monthly_cost: 0, sort_order: sortOrder })
      .then(({ error }) => { if (error) { errToast('operations.add:', error); set(s => ({ operations: s.operations.filter(x => x.id !== id) })); } });
  },
  removeOperation: (id) => {
    const orgId = getOrgId();
    const prev = get().operations;
    set(s => ({ operations: s.operations.filter(x => x.id !== id) }));
    supabase.from('pricing_operations').delete().eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { errToast('operations.remove:', error); set({ operations: prev }); } });
  },

  // ── Volume tiers ──────────────────────────────────────────────
  updateVolumeTier: (productId, id, patch) => {
    const orgId = getOrgId();
    const prev = get().volumeTiersByProduct;
    const volumeTiersByProduct = {
      ...prev,
      [productId]: (prev[productId] ?? []).map(t => t.id === id ? { ...t, ...patch } : t),
    };
    set({ volumeTiersByProduct });
    const dbPatch: Record<string, unknown> = {};
    if (patch.from     !== undefined) dbPatch.tier_from = patch.from;
    if (patch.to       !== undefined) dbPatch.tier_to   = patch.to;
    if (patch.discount !== undefined) dbPatch.discount  = patch.discount;
    supabase.from('pricing_volume_tiers').update(dbPatch).eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { errToast('volume_tiers.update:', error); set({ volumeTiersByProduct: prev }); } });
  },
  addVolumeTier: (productId) => {
    const orgId = getOrgId();
    const id = genId();
    const tiers = get().volumeTiersByProduct[productId] ?? [];
    const lastTo = tiers.length > 0 ? (tiers[tiers.length - 1].to ?? 99) : 0;
    const item: VolumeTier = { id, from: lastTo + 1, to: null, discount: 0 };
    const sortOrder = tiers.length;
    set(s => ({
      volumeTiersByProduct: { ...s.volumeTiersByProduct, [productId]: [...(s.volumeTiersByProduct[productId] ?? []), item] },
    }));
    supabase.from('pricing_volume_tiers').insert({ id, org_id: orgId, product_id: productId, tier_from: item.from, tier_to: null, discount: 0, sort_order: sortOrder })
      .then(({ error }) => {
        if (error) {
          errToast('volume_tiers.add:', error);
          set(s => ({ volumeTiersByProduct: { ...s.volumeTiersByProduct, [productId]: (s.volumeTiersByProduct[productId] ?? []).filter(t => t.id !== id) } }));
        }
      });
  },
  removeVolumeTier: (productId, id) => {
    const orgId = getOrgId();
    const prev = get().volumeTiersByProduct;
    set(s => ({
      volumeTiersByProduct: { ...s.volumeTiersByProduct, [productId]: (s.volumeTiersByProduct[productId] ?? []).filter(t => t.id !== id) },
    }));
    supabase.from('pricing_volume_tiers').delete().eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { errToast('volume_tiers.remove:', error); set({ volumeTiersByProduct: prev }); } });
  },

  // ── Fabrics ───────────────────────────────────────────────────
  updateFabric: (id, patch) => {
    const orgId = getOrgId();
    const prev = get().fabrics;
    const fabrics = prev.map(f => f.id === id ? { ...f, ...patch } : f);
    set({ fabrics });
    const dbPatch: Record<string, unknown> = {};
    if (patch.name          !== undefined) dbPatch.name           = patch.name;
    if (patch.costPerKg     !== undefined) dbPatch.cost_per_kg    = patch.costPerKg;
    if (patch.metersPerKg   !== undefined) dbPatch.meters_per_kg  = patch.metersPerKg;
    if (patch.tubular       !== undefined) dbPatch.tubular        = patch.tubular;
    supabase.from('pricing_fabrics').update(dbPatch).eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { errToast('fabrics.update:', error); set({ fabrics: prev }); } });
  },
  addFabric: () => {
    const orgId = getOrgId();
    const id = genId();
    const sortOrder = get().fabrics.length;
    const item: FabricType = { id, name: 'Nueva tela', costPerKg: 0, metersPerKg: 1, tubular: false };
    set(s => ({ fabrics: [...s.fabrics, item] }));
    supabase.from('pricing_fabrics').insert({ id, org_id: orgId, name: item.name, cost_per_kg: 0, meters_per_kg: 1, tubular: false, sort_order: sortOrder })
      .then(({ error }) => { if (error) { errToast('fabrics.add:', error); set(s => ({ fabrics: s.fabrics.filter(x => x.id !== id) })); } });
  },
  removeFabric: (id) => {
    const orgId = getOrgId();
    const prev = get().fabrics;
    set(s => ({ fabrics: s.fabrics.filter(x => x.id !== id) }));
    supabase.from('pricing_fabrics').delete().eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { errToast('fabrics.remove:', error); set({ fabrics: prev }); } });
  },

  // ── Competitors ───────────────────────────────────────────────
  updateCompetitor: (id, patch) => {
    const orgId = getOrgId();
    const prev = get().competitors;
    const competitors = prev.map(c => c.id === id ? { ...c, ...patch } : c);
    set({ competitors });
    const dbPatch: Record<string, unknown> = {};
    if (patch.name   !== undefined) dbPatch.name   = patch.name;
    if (patch.prices !== undefined) dbPatch.prices = patch.prices;
    supabase.from('pricing_competitors').update(dbPatch).eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { errToast('competitors.update:', error); set({ competitors: prev }); } });
  },
  addCompetitor: () => {
    const orgId = getOrgId();
    const id = genId();
    const sortOrder = get().competitors.length;
    const item: Competitor = { id, name: 'Nuevo competidor', prices: {} };
    set(s => ({ competitors: [...s.competitors, item] }));
    supabase.from('pricing_competitors').insert({ id, org_id: orgId, name: item.name, prices: {}, sort_order: sortOrder })
      .then(({ error }) => { if (error) { errToast('competitors.add:', error); set(s => ({ competitors: s.competitors.filter(x => x.id !== id) })); } });
  },
  removeCompetitor: (id) => {
    const orgId = getOrgId();
    const prev = get().competitors;
    set(s => ({ competitors: s.competitors.filter(x => x.id !== id) }));
    supabase.from('pricing_competitors').delete().eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { errToast('competitors.remove:', error); set({ competitors: prev }); } });
  },

  // ── CM price tiers (embroidery) ───────────────────────────────
  updateCmTier: (id, patch) => {
    const orgId = getOrgId();
    const prev = get().cmPriceTiers;
    const cmPriceTiers = prev.map(t => t.id === id ? { ...t, ...patch } : t);
    set({ cmPriceTiers });
    const dbPatch: Record<string, unknown> = {};
    if (patch.maxCm !== undefined) dbPatch.max_cm = patch.maxCm;
    if (patch.price !== undefined) dbPatch.price  = patch.price;
    supabase.from('pricing_cm_price_tiers').update(dbPatch).eq('id', id).eq('org_id', orgId).eq('tier_type', 'embroidery')
      .then(({ error }) => { if (error) { errToast('cm_tiers.update:', error); set({ cmPriceTiers: prev }); } });
  },
  addCmTier: () => {
    const orgId = getOrgId();
    const id = genId();
    const tiers = get().cmPriceTiers;
    const lastMax = tiers.length > 0 ? Math.max(...tiers.map(t => t.maxCm)) : 0;
    const item: CmPriceTier = { id, maxCm: lastMax + 10, price: 0 };
    set(s => ({ cmPriceTiers: [...s.cmPriceTiers, item] }));
    supabase.from('pricing_cm_price_tiers').insert({ id, org_id: orgId, tier_type: 'embroidery', max_cm: item.maxCm, price: 0, sort_order: tiers.length })
      .then(({ error }) => { if (error) { errToast('cm_tiers.add:', error); set(s => ({ cmPriceTiers: s.cmPriceTiers.filter(x => x.id !== id) })); } });
  },
  removeCmTier: (id) => {
    const orgId = getOrgId();
    const prev = get().cmPriceTiers;
    set(s => ({ cmPriceTiers: s.cmPriceTiers.filter(x => x.id !== id) }));
    supabase.from('pricing_cm_price_tiers').delete().eq('id', id).eq('org_id', orgId).eq('tier_type', 'embroidery')
      .then(({ error }) => { if (error) { errToast('cm_tiers.remove:', error); set({ cmPriceTiers: prev }); } });
  },

  // ── Paper price tiers ─────────────────────────────────────────
  updatePaperTier: (id, patch) => {
    const orgId = getOrgId();
    const prev = get().paperPriceTiers;
    const paperPriceTiers = prev.map(t => t.id === id ? { ...t, ...patch } : t);
    set({ paperPriceTiers });
    const dbPatch: Record<string, unknown> = {};
    if (patch.maxCm !== undefined) dbPatch.max_cm = patch.maxCm;
    if (patch.price !== undefined) dbPatch.price  = patch.price;
    supabase.from('pricing_cm_price_tiers').update(dbPatch).eq('id', id).eq('org_id', orgId).eq('tier_type', 'paper')
      .then(({ error }) => { if (error) { errToast('paper_tiers.update:', error); set({ paperPriceTiers: prev }); } });
  },
  addPaperTier: () => {
    const orgId = getOrgId();
    const id = genId();
    const tiers = get().paperPriceTiers;
    const lastMax = tiers.length > 0 ? Math.max(...tiers.map(t => t.maxCm)) : 0;
    const item: CmPriceTier = { id, maxCm: lastMax + 10, price: 0 };
    set(s => ({ paperPriceTiers: [...s.paperPriceTiers, item] }));
    supabase.from('pricing_cm_price_tiers').insert({ id, org_id: orgId, tier_type: 'paper', max_cm: item.maxCm, price: 0, sort_order: tiers.length })
      .then(({ error }) => { if (error) { errToast('paper_tiers.add:', error); set(s => ({ paperPriceTiers: s.paperPriceTiers.filter(x => x.id !== id) })); } });
  },
  removePaperTier: (id) => {
    const orgId = getOrgId();
    const prev = get().paperPriceTiers;
    set(s => ({ paperPriceTiers: s.paperPriceTiers.filter(x => x.id !== id) }));
    supabase.from('pricing_cm_price_tiers').delete().eq('id', id).eq('org_id', orgId).eq('tier_type', 'paper')
      .then(({ error }) => { if (error) { errToast('paper_tiers.remove:', error); set({ paperPriceTiers: prev }); } });
  },

  // ── Print profiles ────────────────────────────────────────────
  updatePrintProfile: (id, patch) => {
    const orgId = getOrgId();
    const prev = get().printProfiles;
    const printProfiles = prev.map(p => p.id === id ? { ...p, ...patch } : p);
    set({ printProfiles });
    const dbPatch: Record<string, unknown> = {};
    if (patch.name      !== undefined) dbPatch.name       = patch.name;
    if (patch.inkFactor !== undefined) dbPatch.ink_factor = patch.inkFactor;
    if (patch.enabled   !== undefined) dbPatch.enabled    = patch.enabled;
    supabase.from('pricing_print_profiles').update(dbPatch).eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { errToast('print_profiles.update:', error); set({ printProfiles: prev }); } });
  },
  addPrintProfile: () => {
    const orgId = getOrgId();
    const id = genId();
    const sortOrder = get().printProfiles.length;
    const item: PrintProfile = { id, name: 'Nuevo perfil', inkFactor: 1, enabled: true };
    set(s => ({ printProfiles: [...s.printProfiles, item] }));
    supabase.from('pricing_print_profiles').insert({ id, org_id: orgId, name: item.name, ink_factor: 1, enabled: true, sort_order: sortOrder })
      .then(({ error }) => { if (error) { errToast('print_profiles.add:', error); set(s => ({ printProfiles: s.printProfiles.filter(x => x.id !== id) })); } });
  },
  removePrintProfile: (id) => {
    const orgId = getOrgId();
    const prev = get().printProfiles;
    set(s => ({ printProfiles: s.printProfiles.filter(x => x.id !== id) }));
    supabase.from('pricing_print_profiles').delete().eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { errToast('print_profiles.remove:', error); set({ printProfiles: prev }); } });
  },

  // ── Presses (config JSON) ─────────────────────────────────────
  updatePress: (id, patch) => {
    const { config, refClienteId, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant } = get();
    const orgId = getOrgId();
    const updated = { ...config, presses: (config.presses ?? []).map(p => p.id === id ? { ...p, ...patch } : p) };
    set({ config: updated });
    scheduleConfigSave(orgId, updated, refClienteId, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant);
  },
  addPress: () => {
    const { config, refClienteId, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant } = get();
    const orgId = getOrgId();
    const newPress: HeatPress = { id: genId(), name: 'Nueva plancha', widthCm: 75, heightCm: 105, cost: 0, lifeBajadas: 100000, paperSheetsPerBajada: 2 };
    const updated = { ...config, presses: [...(config.presses ?? []), newPress] };
    set({ config: updated });
    scheduleConfigSave(orgId, updated, refClienteId, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant);
  },
  removePress: (id) => {
    const { config, refClienteId, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant } = get();
    const orgId = getOrgId();
    const updated = {
      ...config,
      presses: (config.presses ?? []).filter(p => p.id !== id),
      selectedPressId: config.selectedPressId === id ? null : config.selectedPressId,
    };
    set({ config: updated });
    scheduleConfigSave(orgId, updated, refClienteId, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant);
  },

  // ── Plotters (config JSON) ────────────────────────────────────
  updatePlotter: (id, patch) => {
    const { config, refClienteId, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant } = get();
    const orgId = getOrgId();
    const updated = { ...config, plotters: (config.plotters ?? []).map(p => p.id === id ? { ...p, ...patch } : p) };
    set({ config: updated });
    scheduleConfigSave(orgId, updated, refClienteId, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant);
  },
  addPlotter: () => {
    const { config, refClienteId, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant } = get();
    const orgId = getOrgId();
    const newPlotter: Plotter = { id: genId(), name: 'Nuevo plotter', widthCm: 130 };
    const updated = { ...config, plotters: [...(config.plotters ?? []), newPlotter] };
    set({ config: updated });
    scheduleConfigSave(orgId, updated, refClienteId, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant);
  },
  removePlotter: (id) => {
    const { config, refClienteId, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant } = get();
    const orgId = getOrgId();
    const updated = {
      ...config,
      plotters: (config.plotters ?? []).filter(p => p.id !== id),
      selectedPlotterId: config.selectedPlotterId === id ? null : config.selectedPlotterId,
    };
    set({ config: updated });
    scheduleConfigSave(orgId, updated, refClienteId, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant);
  },

  // ── Ref cliente / gender ──────────────────────────────────────
  setRefCliente: (id) => {
    const orgId = getOrgId();
    const { config, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant } = get();
    set({ refClienteId: id });
    scheduleConfigSave(orgId, config, id, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant);
  },
  setRefGender: (g) => {
    const orgId = getOrgId();
    const { config, refClienteId, refClienteIdPant, refGenderPant, refMoldeIdPant } = get();
    set({ refGender: g });
    scheduleConfigSave(orgId, config, refClienteId, g, refClienteIdPant, refGenderPant, refMoldeIdPant);
  },

  setRefClientePant: (id) => {
    const orgId = getOrgId();
    const { config, refClienteId, refGender, refGenderPant, refMoldeIdPant } = get();
    set({ refClienteIdPant: id });
    scheduleConfigSave(orgId, config, refClienteId, refGender, id, refGenderPant, refMoldeIdPant);
  },
  setRefGenderPant: (g) => {
    const orgId = getOrgId();
    const { config, refClienteId, refGender, refClienteIdPant, refMoldeIdPant } = get();
    set({ refGenderPant: g });
    scheduleConfigSave(orgId, config, refClienteId, refGender, refClienteIdPant, g, refMoldeIdPant);
  },
  setRefMoldePant: (id) => {
    const orgId = getOrgId();
    const { config, refClienteId, refGender, refClienteIdPant, refGenderPant } = get();
    set({ refMoldeIdPant: id });
    scheduleConfigSave(orgId, config, refClienteId, refGender, refClienteIdPant, refGenderPant, id);
  },

  // ── Reset ─────────────────────────────────────────────────────
  resetPricingData: () => {
    const orgId = getOrgId();
    set({
      config:               defaultPricingConfig,
      basePrices:           defaultBasePrices,
      basePricesCompleto:   defaultBasePrices,
      supplies:             defaultSupplies,
      machines:             defaultMachines,
      operations:           defaultOperations,
      volumeTiersByProduct: defaultVolumeTiersByProduct,
      printProfiles:        defaultPrintProfiles,
    });
    resetToDefaults(orgId).catch(e => errToast('resetPricingData:', e));
  },

  // ── History ───────────────────────────────────────────────────
  saveQuote: (quote) => {
    const orgId = getOrgId();
    const entry: QuoteHistoryEntry = {
      ...quote,
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      createdAt: new Date().toISOString(),
    };
    set(s => ({ history: [entry, ...s.history] }));
    supabase.from('pricing_quote_history').insert({ id: entry.id, org_id: orgId, created_at: entry.createdAt, data: entry })
      .then(({ error }) => { if (error) errToast('quote_history.save:', error); });
  },
  clearHistory: () => {
    const orgId = getOrgId();
    set({ history: [] });
    supabase.from('pricing_quote_history').delete().eq('org_id', orgId)
      .then(({ error }) => { if (error) errToast('quote_history.clear:', error); });
  },

  // ── Tabla exports ─────────────────────────────────────────────
  saveTablaExport: (entry) => {
    const orgId = getOrgId();
    const full: TablaExportEntry = {
      ...entry,
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      createdAt: new Date().toISOString(),
    };
    set(s => ({ tablaExports: [full, ...s.tablaExports] }));
    supabase.from('pricing_tabla_exports').insert({
      id: full.id, org_id: orgId, created_at: full.createdAt,
      cliente_id: full.clienteId, cliente_nombre: full.clienteNombre,
      segment: full.segment, profile_id: full.profileId, profile_name: full.profileName,
      data: full,
    }).then(({ error }) => { if (error) errToast('tabla_exports.save:', error); });
  },
  removeTablaExport: (id) => {
    const orgId = getOrgId();
    const prev = get().tablaExports;
    set(s => ({ tablaExports: s.tablaExports.filter(e => e.id !== id) }));
    supabase.from('pricing_tabla_exports').delete().eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { errToast('tabla_exports.remove:', error); set({ tablaExports: prev }); } });
  },

  // ── Cotizaciones ──────────────────────────────────────────────
  saveCotizacion: (entry) => {
    const orgId = getOrgId();
    set(s => ({ cotizaciones: [entry, ...s.cotizaciones] }));
    supabase.from('pricing_cotizaciones').insert({
      id: entry.id, org_id: orgId, created_at: entry.createdAt,
      cliente_nombre: entry.clienteNombre, org_nombre: entry.orgNombre,
      service_mode: entry.serviceMode, total_units: entry.totalUnits,
      total_price: entry.totalPrice, total_profit: entry.totalProfit,
      overall_margin: entry.overallMargin, data: entry,
    }).then(({ error }) => { if (error) errToast('cotizaciones.save:', error); });
  },
  removeCotizacion: (id) => {
    const orgId = getOrgId();
    const prev = get().cotizaciones;
    set(s => ({ cotizaciones: s.cotizaciones.filter(c => c.id !== id) }));
    supabase.from('pricing_cotizaciones').delete().eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { errToast('cotizaciones.remove:', error); set({ cotizaciones: prev }); } });
  },
}));
