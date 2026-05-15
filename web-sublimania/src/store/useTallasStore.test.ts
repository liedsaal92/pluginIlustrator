import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { TallaDims } from '../types';

// ── vi.hoisted: variables compartidas entre el factory de vi.mock y los tests ──

const mockState = vi.hoisted(() => ({
  deleteError:   null as null | { message: string },
  insertError:   null as null | { message: string },
  insertRows:    null as unknown,
  insertCalled:  false,
  deleteCalled:  false,
}));

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Helper para construir una cadena thenable de supabase (select/delete/insert)
function makeSupabaseChain(getResult: () => { data: unknown; error: unknown }) {
  const p = Promise.resolve(null).then(getResult);
  // `chain` es auto-referencial: eq() devuelve chain para poder encadenar múltiples .eq()
  const chain: {
    eq: ReturnType<typeof vi.fn>;
    then: typeof p.then;
    catch: typeof p.catch;
  } = {
    eq:    vi.fn().mockImplementation(() => chain),
    then:  p.then.bind(p),
    catch: p.catch.bind(p),
  };
  return chain;
}

vi.mock('../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      delete: vi.fn(() => {
        mockState.deleteCalled = true;
        return makeSupabaseChain(() => ({ data: null, error: mockState.deleteError }));
      }),
      insert: vi.fn((rows: unknown) => {
        mockState.insertCalled = true;
        mockState.insertRows = rows;
        return makeSupabaseChain(() => ({ data: null, error: mockState.insertError }));
      }),
      select: vi.fn(() =>
        makeSupabaseChain(() => ({ data: [], error: null })),
      ),
    })),
  },
}));

vi.mock('./useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({ session: { user: { orgId: 'org-test' } } }),
  },
}));

const TEST_DEFAULTS: Record<string, TallaDims> = {
  XS: { ALTO: '45', ANCHO: '35', MANGA_ANCHO: '30', MANGA_ALTO: '15' },
  M:  { ALTO: '55', ANCHO: '39', MANGA_ANCHO: '35', MANGA_ALTO: '19' },
};

vi.mock('./useTallasDefaultStore', () => ({
  useTallasDefaultStore: {
    getState: () => ({
      getDefaults: (_moldeId: string) => TEST_DEFAULTS,
      init: vi.fn().mockResolvedValue(undefined),
      loading: false,
    }),
  },
}));

vi.mock('./useToastStore', () => ({
  useToastStore: {
    getState: () => ({ push: vi.fn() }),
  },
}));

// ── Import store DESPUÉS de los mocks ────────────────────────────────────────

import { useTallasStore } from './useTallasStore';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useTallasStore.initClienteFromDefault', () => {
  beforeEach(() => {
    useTallasStore.setState({ tallasPorCliente: {}, loading: false });
    mockState.deleteError  = null;
    mockState.insertError  = null;
    mockState.insertRows   = null;
    mockState.insertCalled = false;
    mockState.deleteCalled = false;
  });

  it('aplica las tallas del default al estado (optimistic update)', async () => {
    await useTallasStore.getState().initClienteFromDefault('cli-1', 'camiseta');
    const tallas = useTallasStore.getState().tallasPorCliente['cli-1']?.['camiseta'];
    expect(tallas).toMatchObject(TEST_DEFAULTS);
  });

  it('llama DELETE al supabase', async () => {
    await useTallasStore.getState().initClienteFromDefault('cli-1', 'camiseta');
    expect(mockState.deleteCalled).toBe(true);
  });

  it('llama INSERT al supabase con las filas correctas', async () => {
    await useTallasStore.getState().initClienteFromDefault('cli-A', 'molde-X');
    expect(mockState.insertCalled).toBe(true);

    const rows = mockState.insertRows as Array<Record<string, string>> ?? [];
    expect(rows).toHaveLength(Object.keys(TEST_DEFAULTS).length);
    expect(rows[0]).toMatchObject({
      org_id:     'org-test',
      cliente_id: 'cli-A',
      molde_id:   'molde-X',
    });
    const tallaNames = rows.map(r => r.talla);
    expect(tallaNames).toContain('XS');
    expect(tallaNames).toContain('M');
  });

  it('DELETE error → estado revierte al previo y NO llama INSERT', async () => {
    const prevTallas = { 'VIEJA': { ALTO: '50', ANCHO: '40', MANGA_ANCHO: '30', MANGA_ALTO: '18' } };
    useTallasStore.setState({
      tallasPorCliente: { 'cli-B': { 'camiseta': prevTallas } },
    });

    mockState.deleteError = { message: 'network error' };

    await useTallasStore.getState().initClienteFromDefault('cli-B', 'camiseta');

    const state = useTallasStore.getState().tallasPorCliente;
    expect(state['cli-B']['camiseta']).toMatchObject(prevTallas); // revertido
    expect(mockState.insertCalled).toBe(false);                   // no INSERT
  });

  it('INSERT error → estado revierte al previo', async () => {
    mockState.insertError = { message: 'insert failed' };

    await useTallasStore.getState().initClienteFromDefault('cli-C', 'camiseta');
    // El .then() del insert es un microtask posterior; dejarlo fluir
    await new Promise(r => setTimeout(r, 0));

    const state = useTallasStore.getState().tallasPorCliente;
    // Prev era vacío → revertir a vacío → cli-C sin tallas de camiseta
    expect(state['cli-C']?.['camiseta']).toBeUndefined();
  });

  it('no mezcla tallas de diferentes moldes del mismo cliente', async () => {
    // Pre-cargar otro molde
    useTallasStore.setState({
      tallasPorCliente: { 'cli-D': { 'pantaloneta': { 'L': { ALTO: '60', ANCHO: '45', MANGA_ANCHO: '', MANGA_ALTO: '' } } } },
    });

    await useTallasStore.getState().initClienteFromDefault('cli-D', 'camiseta');

    const state = useTallasStore.getState().tallasPorCliente;
    // Camiseta tiene las nuevas tallas
    expect(state['cli-D']['camiseta']).toMatchObject(TEST_DEFAULTS);
    // Pantaloneta sigue intacta
    expect(state['cli-D']['pantaloneta']['L']).toBeDefined();
  });
});

// ── Tests adicionales — getTallas / addTalla / removeTalla ───────────────────

describe('useTallasStore.getTallas', () => {
  beforeEach(() => {
    useTallasStore.setState({ tallasPorCliente: {}, loading: false });
  });

  it('devuelve objeto vacío si no hay tallas para el cliente/molde', () => {
    const result = useTallasStore.getState().getTallas('no-existe', 'camiseta');
    expect(result).toEqual({});
  });

  it('normaliza dims faltantes a strings vacíos', () => {
    useTallasStore.setState({
      tallasPorCliente: {
        'cli': { 'cam': { 'M': { ALTO: '55', ANCHO: '', MANGA_ANCHO: '', MANGA_ALTO: '' } } },
      },
    });
    const result = useTallasStore.getState().getTallas('cli', 'cam');
    expect(result['M'].ANCHO).toBe('');
    expect(result['M'].ALTO).toBe('55');
  });
});
