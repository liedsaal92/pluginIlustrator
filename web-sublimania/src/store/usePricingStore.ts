import { create } from 'zustand';
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
  BasePrice, BasePriceField, CmPriceTier, Competitor, CustomerSegment, FabricType, Gender,
  MachineCost, OperationCost, PricingConfig, PrintProfile, ProductId, QuoteHistoryEntry, QuoteResult,
  Supply, TablaExportEntry, VolumeTier,
} from '../pricing/types';

const FABRICS_KEY           = 'subliflow_pricing_fabrics';
const HISTORY_KEY           = 'subliflow_pricing_history';
const TABLA_EXPORTS_KEY     = 'subliflow_tabla_exports';
const CONFIG_KEY            = 'subliflow_pricing_config';
const PRICES_KEY            = 'subliflow_pricing_base_prices';
const PRICES_COMPLETO_KEY   = 'subliflow_pricing_base_prices_completo';
const SUPPLIES_KEY          = 'subliflow_pricing_supplies';
const MACHINES_KEY          = 'subliflow_pricing_machines';
const OPS_KEY               = 'subliflow_pricing_operations';
const TIERS_KEY             = 'subliflow_pricing_volume_tiers_v2';
const COMPETITORS_KEY       = 'subliflow_pricing_competitors';
const CM_TIERS_KEY          = 'subliflow_pricing_cm_price_tiers';
const PAPER_TIERS_KEY       = 'subliflow_pricing_paper_price_tiers';
const PROFILES_KEY          = 'subliflow_pricing_print_profiles';
const REF_CLIENTE_KEY       = 'subliflow_pricing_ref_cliente';
const REF_GENDER_KEY        = 'subliflow_pricing_ref_gender';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function migrateConfig(raw: PricingConfig): PricingConfig {
  const out = { ...defaultPricingConfig, ...raw };
  // migrate old single-rate field to per-segment
  const legacy = (raw as unknown as Record<string, unknown>)['defaultSavingsTransferRate'];
  if (typeof legacy === 'number' && !('savingsTransferRateNormal' in raw)) {
    out.savingsTransferRateNormal = legacy;
    out.savingsTransferRateVip = legacy;
  }
  return out;
}

function migrateBasePrices(raw: BasePrice[]): BasePrice[] {
  if (!raw.length) return defaultBasePrices;
  // Old rows lack gender — duplicate: H from existing, M as copies
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
  // older records may lack the `enabled` field — default to true
  return raw.map(p => ({ ...p, enabled: p.enabled ?? true }));
}

function persist<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function genId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

interface PricingState {
  config: PricingConfig;
  basePrices: BasePrice[];
  supplies: Supply[];
  machines: MachineCost[];
  operations: OperationCost[];
  history: QuoteHistoryEntry[];

  updateConfig: <K extends keyof PricingConfig>(key: K, value: PricingConfig[K]) => void;
  updateBasePrice: (segment: CustomerSegment, gender: Gender, size: number, field: BasePriceField, value: number) => void;
  basePricesCompleto: BasePrice[];
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

  volumeTiersByProduct: Record<ProductId, VolumeTier[]>;
  updateVolumeTier: (productId: ProductId, id: string, patch: Partial<Omit<VolumeTier, 'id'>>) => void;
  addVolumeTier: (productId: ProductId) => void;
  removeVolumeTier: (productId: ProductId, id: string) => void;

  fabrics: FabricType[];
  updateFabric: (id: string, patch: Partial<Omit<FabricType, 'id'>>) => void;
  addFabric: () => void;
  removeFabric: (id: string) => void;

  competitors: Competitor[];
  updateCompetitor: (id: string, patch: Partial<Omit<Competitor, 'id'>>) => void;
  addCompetitor: () => void;
  removeCompetitor: (id: string) => void;

  cmPriceTiers: CmPriceTier[];
  updateCmTier: (id: string, patch: Partial<Omit<CmPriceTier, 'id'>>) => void;
  addCmTier: () => void;
  removeCmTier: (id: string) => void;

  paperPriceTiers: CmPriceTier[];
  updatePaperTier: (id: string, patch: Partial<Omit<CmPriceTier, 'id'>>) => void;
  addPaperTier: () => void;
  removePaperTier: (id: string) => void;

  printProfiles: PrintProfile[];
  updatePrintProfile: (id: string, patch: Partial<Omit<PrintProfile, 'id'>>) => void;
  addPrintProfile: () => void;
  removePrintProfile: (id: string) => void;

  refClienteId: string | null;
  refGender: Gender | null;
  setRefCliente: (id: string | null) => void;
  setRefGender: (g: Gender | null) => void;

  resetPricingData: () => void;
  saveQuote: (quote: QuoteResult) => void;
  clearHistory: () => void;

  tablaExports: TablaExportEntry[];
  saveTablaExport: (entry: Omit<TablaExportEntry, 'id' | 'createdAt'>) => void;
  removeTablaExport: (id: string) => void;
}

export const usePricingStore = create<PricingState>()((set, get) => ({
  config:              migrateConfig(loadJson(CONFIG_KEY, defaultPricingConfig)),
  basePrices:          migrateBasePrices(loadJson(PRICES_KEY, defaultBasePrices)),
  basePricesCompleto:  migrateBasePrices(loadJson(PRICES_COMPLETO_KEY, defaultBasePrices)),
  supplies:       loadJson(SUPPLIES_KEY,    defaultSupplies),
  machines:       loadJson(MACHINES_KEY,    defaultMachines),
  operations:     loadJson(OPS_KEY,         defaultOperations),
  volumeTiersByProduct: loadJson(TIERS_KEY, defaultVolumeTiersByProduct),
  fabrics:        loadJson(FABRICS_KEY,     defaultFabrics),
  competitors:    loadJson(COMPETITORS_KEY, defaultCompetitors),
  cmPriceTiers:    loadJson(CM_TIERS_KEY,    defaultCmPriceTiers),
  paperPriceTiers: loadJson(PAPER_TIERS_KEY, defaultPaperPriceTiers),
  printProfiles:  migratePrintProfiles(loadJson(PROFILES_KEY, defaultPrintProfiles)),
  history:        loadJson(HISTORY_KEY,      [] as QuoteHistoryEntry[]),
  tablaExports:   loadJson(TABLA_EXPORTS_KEY, [] as TablaExportEntry[]),
  refClienteId:  localStorage.getItem(REF_CLIENTE_KEY) || null,
  refGender:     (localStorage.getItem(REF_GENDER_KEY) as Gender | null) || null,

  updateConfig: (key, value) => {
    const config = { ...get().config, [key]: value };
    persist(CONFIG_KEY, config);
    set({ config });
  },

  updateBasePrice: (segment, gender, size, field, value) => {
    const basePrices = get().basePrices.map(row =>
      row.segment === segment && row.gender === gender && row.size === size
        ? { ...row, [field]: Number.isFinite(value) ? value : 0 }
        : row
    );
    persist(PRICES_KEY, basePrices);
    set({ basePrices });
  },

  updateBasePriceCompleto: (segment, gender, size, field, value) => {
    const basePricesCompleto = get().basePricesCompleto.map(row =>
      row.segment === segment && row.gender === gender && row.size === size
        ? { ...row, [field]: Number.isFinite(value) ? value : 0 }
        : row
    );
    persist(PRICES_COMPLETO_KEY, basePricesCompleto);
    set({ basePricesCompleto });
  },

  updateSupply: (id, patch) => {
    const supplies = get().supplies.map(s => s.id === id ? { ...s, ...patch } : s);
    persist(SUPPLIES_KEY, supplies);
    set({ supplies });
  },
  addSupply: () => {
    const supplies = [...get().supplies, {
      id: genId(), name: 'Nuevo insumo', totalCost: 0, quantity: 1, unit: 'm', applyInkFactor: false,
    }];
    persist(SUPPLIES_KEY, supplies);
    set({ supplies });
  },
  removeSupply: (id) => {
    const supplies = get().supplies.filter(s => s.id !== id);
    persist(SUPPLIES_KEY, supplies);
    set({ supplies });
  },

  updateMachine: (id, patch) => {
    const machines = get().machines.map(m => m.id === id ? { ...m, ...patch } : m);
    persist(MACHINES_KEY, machines);
    set({ machines });
  },
  addMachine: () => {
    const machines = [...get().machines, {
      id: genId(), name: 'Nuevo equipo', cost: 0, lifeMeters: 1000,
    }];
    persist(MACHINES_KEY, machines);
    set({ machines });
  },
  removeMachine: (id) => {
    const machines = get().machines.filter(m => m.id !== id);
    persist(MACHINES_KEY, machines);
    set({ machines });
  },

  updateOperation: (id, patch) => {
    const operations = get().operations.map(o => o.id === id ? { ...o, ...patch } : o);
    persist(OPS_KEY, operations);
    set({ operations });
  },
  addOperation: () => {
    const operations = [...get().operations, {
      id: genId(), name: 'Nuevo costo', monthlyCost: 0,
    }];
    persist(OPS_KEY, operations);
    set({ operations });
  },
  removeOperation: (id) => {
    const operations = get().operations.filter(o => o.id !== id);
    persist(OPS_KEY, operations);
    set({ operations });
  },

  updateVolumeTier: (productId, id, patch) => {
    const prev = get().volumeTiersByProduct;
    const volumeTiersByProduct = {
      ...prev,
      [productId]: (prev[productId] ?? []).map(t => t.id === id ? { ...t, ...patch } : t),
    };
    persist(TIERS_KEY, volumeTiersByProduct);
    set({ volumeTiersByProduct });
  },
  addVolumeTier: (productId) => {
    const prev = get().volumeTiersByProduct;
    const tiers = prev[productId] ?? [];
    const lastTo = tiers.length > 0 ? (tiers[tiers.length - 1].to ?? 99) : 0;
    const volumeTiersByProduct = {
      ...prev,
      [productId]: [...tiers, { id: genId(), from: lastTo + 1, to: null, discount: 0 }],
    };
    persist(TIERS_KEY, volumeTiersByProduct);
    set({ volumeTiersByProduct });
  },
  removeVolumeTier: (productId, id) => {
    const prev = get().volumeTiersByProduct;
    const volumeTiersByProduct = {
      ...prev,
      [productId]: (prev[productId] ?? []).filter(t => t.id !== id),
    };
    persist(TIERS_KEY, volumeTiersByProduct);
    set({ volumeTiersByProduct });
  },

  updateFabric: (id, patch) => {
    const fabrics = get().fabrics.map(f => f.id === id ? { ...f, ...patch } : f);
    persist(FABRICS_KEY, fabrics);
    set({ fabrics });
  },
  addFabric: () => {
    const fabrics = [...get().fabrics, {
      id: genId(), name: 'Nueva tela', costPerKg: 0, metersPerKg: 1, tubular: false,
    }];
    persist(FABRICS_KEY, fabrics);
    set({ fabrics });
  },
  removeFabric: (id) => {
    const fabrics = get().fabrics.filter(f => f.id !== id);
    persist(FABRICS_KEY, fabrics);
    set({ fabrics });
  },

  updateCompetitor: (id, patch) => {
    const competitors = get().competitors.map(c => c.id === id ? { ...c, ...patch } : c);
    persist(COMPETITORS_KEY, competitors);
    set({ competitors });
  },

  updateCmTier: (id, patch) => {
    const cmPriceTiers = get().cmPriceTiers.map(t => t.id === id ? { ...t, ...patch } : t);
    persist(CM_TIERS_KEY, cmPriceTiers);
    set({ cmPriceTiers });
  },
  addCmTier: () => {
    const tiers = get().cmPriceTiers;
    const lastMax = tiers.length > 0 ? Math.max(...tiers.map(t => t.maxCm)) : 0;
    const cmPriceTiers = [...tiers, { id: genId(), maxCm: lastMax + 10, price: 0 }];
    persist(CM_TIERS_KEY, cmPriceTiers);
    set({ cmPriceTiers });
  },
  removeCmTier: (id) => {
    const cmPriceTiers = get().cmPriceTiers.filter(t => t.id !== id);
    persist(CM_TIERS_KEY, cmPriceTiers);
    set({ cmPriceTiers });
  },

  updatePaperTier: (id, patch) => {
    const paperPriceTiers = get().paperPriceTiers.map(t => t.id === id ? { ...t, ...patch } : t);
    persist(PAPER_TIERS_KEY, paperPriceTiers);
    set({ paperPriceTiers });
  },
  addPaperTier: () => {
    const tiers = get().paperPriceTiers;
    const lastMax = tiers.length > 0 ? Math.max(...tiers.map(t => t.maxCm)) : 0;
    const paperPriceTiers = [...tiers, { id: genId(), maxCm: lastMax + 10, price: 0 }];
    persist(PAPER_TIERS_KEY, paperPriceTiers);
    set({ paperPriceTiers });
  },
  removePaperTier: (id) => {
    const paperPriceTiers = get().paperPriceTiers.filter(t => t.id !== id);
    persist(PAPER_TIERS_KEY, paperPriceTiers);
    set({ paperPriceTiers });
  },
  addCompetitor: () => {
    const competitors = [...get().competitors, { id: genId(), name: 'Nuevo competidor', prices: {} }];
    persist(COMPETITORS_KEY, competitors);
    set({ competitors });
  },
  removeCompetitor: (id) => {
    const competitors = get().competitors.filter(c => c.id !== id);
    persist(COMPETITORS_KEY, competitors);
    set({ competitors });
  },

  updatePrintProfile: (id, patch) => {
    const printProfiles = get().printProfiles.map(p => p.id === id ? { ...p, ...patch } : p);
    persist(PROFILES_KEY, printProfiles);
    set({ printProfiles });
  },
  addPrintProfile: () => {
    const printProfiles = [...get().printProfiles, {
      id: genId(), name: 'Nuevo perfil', inkFactor: 1, enabled: true,
    }];
    persist(PROFILES_KEY, printProfiles);
    set({ printProfiles });
  },
  removePrintProfile: (id) => {
    const printProfiles = get().printProfiles.filter(p => p.id !== id);
    persist(PROFILES_KEY, printProfiles);
    set({ printProfiles });
  },

  setRefCliente: (id) => {
    if (id) localStorage.setItem(REF_CLIENTE_KEY, id);
    else localStorage.removeItem(REF_CLIENTE_KEY);
    set({ refClienteId: id });
  },
  setRefGender: (g) => {
    if (g) localStorage.setItem(REF_GENDER_KEY, g);
    else localStorage.removeItem(REF_GENDER_KEY);
    set({ refGender: g });
  },

  resetPricingData: () => {
    persist(CONFIG_KEY,    defaultPricingConfig);
    persist(PRICES_KEY,    defaultBasePrices);
    persist(SUPPLIES_KEY,  defaultSupplies);
    persist(MACHINES_KEY,  defaultMachines);
    persist(OPS_KEY,       defaultOperations);
    persist(TIERS_KEY,     defaultVolumeTiersByProduct);
    persist(PROFILES_KEY,  defaultPrintProfiles);
    set({
      config:         defaultPricingConfig,
      basePrices:     defaultBasePrices,
      supplies:       defaultSupplies,
      machines:       defaultMachines,
      operations:     defaultOperations,
      volumeTiersByProduct: defaultVolumeTiersByProduct,
      printProfiles:  defaultPrintProfiles,
    });
  },

  saveQuote: (quote) => {
    const entry: QuoteHistoryEntry = {
      ...quote,
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      createdAt: new Date().toISOString(),
    };
    const history = [entry, ...get().history].slice(0, 80);
    persist(HISTORY_KEY, history);
    set({ history });
  },

  clearHistory: () => {
    persist(HISTORY_KEY, []);
    set({ history: [] });
  },

  saveTablaExport: (entry) => {
    const full: TablaExportEntry = {
      ...entry,
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      createdAt: new Date().toISOString(),
    };
    const tablaExports = [full, ...get().tablaExports].slice(0, 50);
    persist(TABLA_EXPORTS_KEY, tablaExports);
    set({ tablaExports });
  },
  removeTablaExport: (id) => {
    const tablaExports = get().tablaExports.filter(e => e.id !== id);
    persist(TABLA_EXPORTS_KEY, tablaExports);
    set({ tablaExports });
  },
}));
