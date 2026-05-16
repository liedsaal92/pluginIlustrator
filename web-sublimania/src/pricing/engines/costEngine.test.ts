import { describe, it, expect } from 'vitest';
import { calcShirtMetersFromDims, calculateCost, getCostPerMeter } from './costEngine';
import type { BasePrice, MachineCost, OperationCost, PricingConfig, PrintProfile, Supply } from '../types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PLOTTER_130 = 130;

const minConfig: PricingConfig = {
  monthlyMeters: 100,
  minMargin: 0,
  minProfitRatio: 0,
  wasteRate: 0,
  rollWidthCm: PLOTTER_130,
  roundingEnabled: false,
  roundingIncrement: 0,
  pricePerCm: 0,
  savingsTransferRateNormal: 0,
  savingsTransferRateVip: 0,
  defaultProfileId: 'p_normal',
  tailoringCamiseta: 0,
  tailoringPantaloneta: 0,
  polinesCost: 0,
  defaultFabricCamisetaId: null,
  defaultFabricPantalonetaId: null,
  orgNombre: 'Test',
  presses: [],
  selectedPressId: null,
  plotters: [],
  selectedPlotterId: null,
  perBajadaSupplyIds: [],
};

const profiles: PrintProfile[] = [
  { id: 'p_normal', name: 'Normal', inkFactor: 1, enabled: true },
  { id: 'p_light',  name: 'Light',  inkFactor: 0.5, enabled: true },
];

const basePrices: BasePrice[] = [
  { segment: 'normal', gender: 'H', size: 28, camiseta: 20000, pantaloneta: 16000, equipo: 36000 },
  { segment: 'normal', gender: 'H', size: 36, camiseta: 28000, pantaloneta: 22000, equipo: 50000 },
];

// Supply que no aplica inkFactor: 1000 COP/m (totalCost=1000, quantity=1)
const supplies: Supply[] = [
  { id: 's1', name: 'Tinta', totalCost: 1000, quantity: 1, unit: 'm', applyInkFactor: false },
];

const machines: MachineCost[] = [
  { id: 'm1', name: 'Plotter', cost: 500, lifeMeters: 500 },  // 1 COP/m
];

const operations: OperationCost[] = [
  { id: 'o1', name: 'Arriendo', monthlyCost: 300 },  // 300/100=3 COP/m (monthlyMeters=100)
];
// Total costPerMeter = 1000 + 1 + 3 = 1004 COP/m

// ── calcShirtMetersFromDims ───────────────────────────────────────────────────

describe('calcShirtMetersFromDims', () => {

  it('camiseta normal — ancho*2 cabe en plotter → torsoM=alto/100', () => {
    // talla 28H: ANCHO=39, ALTO=55 → 2*39=78 ≤ 130 → torsoM=0.55
    // MANGA_ANCHO=35 → 2*35=70 ≤ 130 → sleeveM=0.19
    const m = calcShirtMetersFromDims(
      { ALTO: '55', ANCHO: '39', MANGA_ANCHO: '35', MANGA_ALTO: '19' },
      PLOTTER_130,
    );
    expect(m).toBeCloseTo(0.74, 5);
  });

  it('torso ancho — ancho*2 NO cabe → torsoM=alto*2/100', () => {
    // ANCHO=70 → 2*70=140 > 130 → torsoM=90*2/100=1.8
    const m = calcShirtMetersFromDims(
      { ALTO: '90', ANCHO: '70', MANGA_ANCHO: '0', MANGA_ALTO: '0' },
      PLOTTER_130,
    );
    expect(m).toBeCloseTo(1.8, 5);
  });

  it('pantaloneta — MANGA vacío → sleeveM=0, total=torsoM', () => {
    // ANCHO=39, ALTO=55 → torsoM=0.55; MANGA vacío → sleeveM=0
    const m = calcShirtMetersFromDims(
      { ALTO: '55', ANCHO: '39', MANGA_ANCHO: '', MANGA_ALTO: '' },
      PLOTTER_130,
    );
    expect(m).toBeCloseTo(0.55, 5);
  });

  it('manga que no cabe → sleeveM=mangaAlto*2/100', () => {
    // MANGA_ANCHO=70 → 2*70=140 > 130 → sleeveM=30*2/100=0.6
    const m = calcShirtMetersFromDims(
      { ALTO: '0', ANCHO: '0', MANGA_ANCHO: '70', MANGA_ALTO: '30' },
      PLOTTER_130,
    );
    expect(m).toBeCloseTo(0.6, 5);
  });

  it('todo cero → 0 metros', () => {
    const m = calcShirtMetersFromDims(
      { ALTO: '0', ANCHO: '0', MANGA_ANCHO: '0', MANGA_ALTO: '0' },
      PLOTTER_130,
    );
    expect(m).toBe(0);
  });
});

// ── getCostPerMeter ───────────────────────────────────────────────────────────

describe('getCostPerMeter', () => {
  it('perfil desconocido → throws', () => {
    expect(() => getCostPerMeter('no_existe', minConfig, [], [], [], profiles)).toThrow('no_existe');
  });

  it('perfil normal inkFactor=1 → costo correcto', () => {
    const cpm = getCostPerMeter('p_normal', minConfig, supplies, machines, operations, profiles);
    // suppliesCost=1000, machineCost=1, operationCost=3 → 1004
    expect(cpm).toBeCloseTo(1004, 1);
  });

  it('perfil light inkFactor=0.5 → supply applyInkFactor=false → mismo costo', () => {
    // supply no aplica inkFactor → sigue siendo 1000; máquina y op no cambian
    const cpm = getCostPerMeter('p_light', minConfig, supplies, machines, operations, profiles);
    expect(cpm).toBeCloseTo(1004, 1);
  });

  it('supply con applyInkFactor=true se escala con inkFactor', () => {
    const inkSupply: Supply[] = [
      { id: 'ink', name: 'Tinta', totalCost: 1000, quantity: 1, unit: 'm', applyInkFactor: true },
    ];
    const cpmNormal = getCostPerMeter('p_normal', minConfig, inkSupply, [], [], profiles); // inkFactor=1 → 1000
    const cpmLight  = getCostPerMeter('p_light',  minConfig, inkSupply, [], [], profiles); // inkFactor=0.5 → 500
    expect(cpmNormal).toBeCloseTo(1000, 1);
    expect(cpmLight).toBeCloseTo(500, 1);
  });
});

// ── calculateCost — camiseta ──────────────────────────────────────────────────

describe('calculateCost — camiseta', () => {

  const baseInput = {
    productId: 'camiseta' as const,
    segment: 'normal' as const,
    gender: 'H' as const,
    size: 28,
    quantity: 10,
    profileId: 'p_normal',
    profiles,
    basePrices,
    supplies: [],
    machines: [],
    operations: [],
    config: minConfig,
  };

  it('sin tallaDims → usa sizeMeasurements → metersUnit=0.74', () => {
    const result = calculateCost(baseInput);
    expect(result.metersUnit).toBeCloseTo(0.74, 2);
  });

  it('con tallaDims → usa dims reales', () => {
    const result = calculateCost({
      ...baseInput,
      tallaDims: { ALTO: '55', ANCHO: '39', MANGA_ANCHO: '35', MANGA_ALTO: '19' },
    });
    expect(result.metersUnit).toBeCloseTo(0.74, 2);
    expect(result.measurementSource).toBe('real');
  });

  it('totalCost = unitCost * quantity', () => {
    const result = calculateCost({ ...baseInput, quantity: 5 });
    expect(result.totalCost).toBeCloseTo(result.unitCost * 5, 2);
  });

  it('wasteRate incrementa metros', () => {
    const sin = calculateCost({ ...baseInput, config: { ...minConfig, wasteRate: 0 } });
    const con = calculateCost({ ...baseInput, config: { ...minConfig, wasteRate: 0.1 } });
    expect(con.metersUnit).toBeGreaterThan(sin.metersUnit);
  });
});

// ── calculateCost — pantaloneta ───────────────────────────────────────────────

describe('calculateCost — pantaloneta', () => {

  const baseInput = {
    productId: 'pantaloneta' as const,
    segment: 'normal' as const,
    gender: 'H' as const,
    size: 28,
    quantity: 1,
    profileId: 'p_normal',
    profiles,
    basePrices,
    supplies: [],
    machines: [],
    operations: [],
    config: minConfig,
  };

  it('sin tallaDims → estimada por ratio, source=estimated, nota en notes', () => {
    const result = calculateCost(baseInput);
    // ratio = 16000/20000 = 0.8 → pMeters = sizeMeasurements(28).shirtMeters * 0.8 = 0.74 * 0.8 = 0.592
    expect(result.metersUnit).toBeCloseTo(0.592, 2);
    expect(result.measurementSource).toBe('estimated');
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('con tallaDims → usa dims directamente, NO aplica ratio', () => {
    // Si aplica ratio: 0.55 * 0.8 = 0.44. Si usa dims: 0.55. Debe ser 0.55.
    const result = calculateCost({
      ...baseInput,
      tallaDims: { ALTO: '55', ANCHO: '39', MANGA_ANCHO: '', MANGA_ALTO: '' },
    });
    expect(result.metersUnit).toBeCloseTo(0.55, 2);
    expect(result.measurementSource).toBe('real');
    expect(result.notes).toHaveLength(0);
  });

  it('con tallaDims — metros NO son metros_camiseta * ratio', () => {
    const conDims = calculateCost({
      ...baseInput,
      tallaDims: { ALTO: '55', ANCHO: '39', MANGA_ANCHO: '', MANGA_ALTO: '' },
    });
    const sinDims = calculateCost(baseInput);
    // Con dims: 0.55. Sin dims (estimado): 0.592. Deben ser distintos.
    expect(conDims.metersUnit).not.toBeCloseTo(sinDims.metersUnit, 2);
  });
});

// ── calculateCost — equipo ────────────────────────────────────────────────────

describe('calculateCost — equipo', () => {

  const baseInput = {
    productId: 'equipo' as const,
    segment: 'normal' as const,
    gender: 'H' as const,
    size: 28,
    quantity: 1,
    profileId: 'p_normal',
    profiles,
    basePrices,
    supplies: [],
    machines: [],
    operations: [],
    config: minConfig,
  };

  it('sin tallaDims → source=estimated, nota incluida', () => {
    const result = calculateCost(baseInput);
    expect(result.measurementSource).toBe('estimated');
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('con tallaDims (camiseta) → source=estimated porque pant sigue siendo ratio', () => {
    const result = calculateCost({
      ...baseInput,
      tallaDims: { ALTO: '55', ANCHO: '39', MANGA_ANCHO: '35', MANGA_ALTO: '19' },
    });
    expect(result.measurementSource).toBe('estimated');
    // camisetaMeters ≈ 0.74, pantalonetaMeters = 0.74 * 0.8 = 0.592
    expect(result.metersUnit).toBeCloseTo(0.74 + 0.592, 1);
  });

  it('con tallaDims + tallaDimsPant → pant usa dims reales, source=real', () => {
    const result = calculateCost({
      ...baseInput,
      tallaDims:     { ALTO: '55', ANCHO: '39', MANGA_ANCHO: '35', MANGA_ALTO: '19' },
      tallaDimsPant: { ALTO: '55', ANCHO: '39', MANGA_ANCHO: '', MANGA_ALTO: '' },
    });
    // camisetaMeters ≈ 0.74, pantalonetaMeters = 0.55 (dims reales, no ratio 0.592)
    expect(result.metersUnit).toBeCloseTo(0.74 + 0.55, 2);
    expect(result.measurementSource).toBe('real');
    expect(result.notes).toHaveLength(0);
  });

  it('con tallaDimsPant solo (sin tallaDims) → source=estimated', () => {
    const result = calculateCost({
      ...baseInput,
      tallaDimsPant: { ALTO: '55', ANCHO: '39', MANGA_ANCHO: '', MANGA_ALTO: '' },
    });
    expect(result.measurementSource).toBe('estimated');
  });
});

// ── calculateCost — por_cm ────────────────────────────────────────────────────

describe('calculateCost — por_cm', () => {

  it('metros = (linearCm/100) * (widthCm/plotterWidth)', () => {
    const result = calculateCost({
      productId: 'por_cm',
      segment: 'normal',
      gender: 'H',
      size: 28,
      quantity: 1,
      profileId: 'p_normal',
      profiles,
      basePrices,
      supplies: [],
      machines: [],
      operations: [],
      config: minConfig,
      linearCm: 50,
      widthCm: 65,
    });
    // (50/100) * (65/130) = 0.5 * 0.5 = 0.25
    expect(result.metersUnit).toBeCloseTo(0.25, 5);
  });

  it('sin widthCm → ratio=1 → metros = linearCm/100', () => {
    const result = calculateCost({
      productId: 'por_cm',
      segment: 'normal',
      gender: 'H',
      size: 28,
      quantity: 1,
      profileId: 'p_normal',
      profiles,
      basePrices,
      supplies: [],
      machines: [],
      operations: [],
      config: minConfig,
      linearCm: 100,
    });
    expect(result.metersUnit).toBeCloseTo(1.0, 5);
  });
});
