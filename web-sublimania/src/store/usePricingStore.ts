import { create } from 'zustand';
import { defaultBasePrices } from '../pricing/data/basePrices';
import { defaultPricingConfig } from '../pricing/data/config';
import type { BasePrice, BasePriceField, CustomerSegment, PricingConfig, QuoteHistoryEntry, QuoteResult } from '../pricing/types';

const HISTORY_KEY = 'subliflow_pricing_history';
const CONFIG_KEY = 'subliflow_pricing_config';
const PRICES_KEY = 'subliflow_pricing_base_prices';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function persist<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

interface PricingState {
  config: PricingConfig;
  basePrices: BasePrice[];
  history: QuoteHistoryEntry[];
  updateConfig: <K extends keyof PricingConfig>(key: K, value: PricingConfig[K]) => void;
  updateBasePrice: (segment: CustomerSegment, size: number, field: BasePriceField, value: number) => void;
  resetPricingData: () => void;
  saveQuote: (quote: QuoteResult) => void;
  clearHistory: () => void;
}

export const usePricingStore = create<PricingState>()((set, get) => ({
  config: loadJson(CONFIG_KEY, defaultPricingConfig),
  basePrices: loadJson(PRICES_KEY, defaultBasePrices),
  history: loadJson(HISTORY_KEY, [] as QuoteHistoryEntry[]),

  updateConfig: (key, value) => {
    const config = { ...get().config, [key]: value };
    persist(CONFIG_KEY, config);
    set({ config });
  },

  updateBasePrice: (segment, size, field, value) => {
    const basePrices = get().basePrices.map(row =>
      row.segment === segment && row.size === size
        ? { ...row, [field]: Number.isFinite(value) ? value : 0 }
        : row
    );
    persist(PRICES_KEY, basePrices);
    set({ basePrices });
  },

  resetPricingData: () => {
    persist(CONFIG_KEY, defaultPricingConfig);
    persist(PRICES_KEY, defaultBasePrices);
    set({ config: defaultPricingConfig, basePrices: defaultBasePrices });
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
}));
