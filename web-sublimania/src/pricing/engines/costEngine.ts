import { sizeMeasurements } from '../data/sizeMeasurements';
import type {
  BasePrice, CostBreakdown, FabricType, Gender, HeatPress, MachineCost, OperationCost,
  PricingConfig, PrintProfile, PrintProfileId, ProductId, CustomerSegment, Supply,
} from '../types';
import { PHYSICAL_SIZES } from '../types';

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calcPiecesPerBajada(pieceW: number, pieceH: number, press: HeatPress): number {
  if (pieceW <= 0 || pieceH <= 0) return 1;
  const pw = press.widthCm;
  const ph = press.heightCm;
  const normal  = Math.floor(pw / pieceW) * Math.floor(ph / pieceH);
  const rotated = Math.floor(pw / pieceH) * Math.floor(ph / pieceW);
  return Math.max(1, normal, rotated);
}

function fitsTwoPieces(w: number, h: number, press: HeatPress): boolean {
  return (w * 2 <= press.widthCm && h <= press.heightCm) ||
         (h * 2 <= press.widthCm && w <= press.heightCm);
}

export function calcBajadasDePlancha(
  dims: { ANCHO: string; ALTO: string; MANGA_ANCHO: string; MANGA_ALTO: string },
  press: HeatPress,
): number {
  const ancho      = parseFloat(dims.ANCHO)       || 0;
  const alto       = parseFloat(dims.ALTO)        || 0;
  const mangaAncho = parseFloat(dims.MANGA_ANCHO) || 0;
  const mangaAlto  = parseFloat(dims.MANGA_ALTO)  || 0;
  const torsoBajadas  = fitsTwoPieces(ancho,      alto,      press) ? 1 : 2;
  const mangasBajadas = fitsTwoPieces(mangaAncho, mangaAlto, press) ? 1 : 2;
  return torsoBajadas + mangasBajadas;
}

export function calcBajadasFromSizeMeasurement(
  sm: { torsoWidthCm: number; torsoHeightCm: number; sleeveWidthCm: number; sleeveHeightCm: number },
  press: HeatPress,
): number {
  const torsoBajadas  = fitsTwoPieces(sm.torsoWidthCm,  sm.torsoHeightCm,  press) ? 1 : 2;
  const mangasBajadas = fitsTwoPieces(sm.sleeveWidthCm, sm.sleeveHeightCm, press) ? 1 : 2;
  return torsoBajadas + mangasBajadas;
}

export function calcShirtMetersFromDims(
  dims: { ALTO: string; ANCHO: string; MANGA_ANCHO: string; MANGA_ALTO: string },
  plotterWidthCm: number,
): number {
  const ancho      = parseFloat(dims.ANCHO)       || 0;
  const alto       = parseFloat(dims.ALTO)        || 0;
  const mangaAncho = parseFloat(dims.MANGA_ANCHO) || 0;
  const mangaAlto  = parseFloat(dims.MANGA_ALTO)  || 0;
  // Probar orientación normal y rotada 90° — usar la que requiere menos metros
  const torsoNormal   = (ancho * 2      <= plotterWidthCm ? alto      : alto  * 2) / 100;
  const torsoRotated  = (alto  * 2      <= plotterWidthCm ? ancho     : ancho * 2) / 100;
  const torsoM        = Math.min(torsoNormal, torsoRotated);
  const sleeveNormal  = (mangaAncho * 2 <= plotterWidthCm ? mangaAlto : mangaAlto * 2) / 100;
  const sleeveRotated = (mangaAlto  * 2 <= plotterWidthCm ? mangaAncho : mangaAncho * 2) / 100;
  const sleeveM       = Math.min(sleeveNormal, sleeveRotated);
  return torsoM + sleeveM;
}

function computeCostWithInkFactor(
  inkFactor: number,
  _config: PricingConfig,
  supplies: Supply[],
  machines: MachineCost[],
  _operations: OperationCost[],
  excludeSupplyIds?: string[],
): number {
  const suppliesCost = supplies.reduce((sum, s) => {
    if (!s.quantity || s.quantity <= 0) return sum;
    if (excludeSupplyIds?.includes(s.id)) return sum;
    const cpm = s.totalCost / s.quantity;
    return sum + (s.applyInkFactor ? cpm * inkFactor : cpm);
  }, 0);

  const machineCost = machines.reduce((sum, m) => {
    if (!m.lifeMeters || m.lifeMeters <= 0) return sum;
    return sum + m.cost / m.lifeMeters;
  }, 0);

  return suppliesCost + machineCost;
}

export function getCostPerMeter(
  profileId: PrintProfileId,
  config: PricingConfig,
  supplies: Supply[],
  machines: MachineCost[],
  operations: OperationCost[],
  profiles: PrintProfile[],
  excludeSupplyIds?: string[],
): number {
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) throw new Error(`Perfil no encontrado: ${profileId}`);
  return computeCostWithInkFactor(profile.inkFactor, config, supplies, machines, operations, excludeSupplyIds);
}

export function getSizeMeasurement(size: number) {
  const measurement = sizeMeasurements.find(item => item.size === size);
  if (!measurement) throw new Error(`Talla no configurada: ${size}`);
  return measurement;
}

function getMetersForProduct(
  productId: ProductId,
  _basePrices: BasePrice[],
  _segment: CustomerSegment,
  _gender: Gender,
  size: number,
  plotterWidthCm: number,
  linearCm?: number,
  widthCm?: number,
  tallaDims?: { ALTO: string; ANCHO: string; MANGA_ANCHO: string; MANGA_ALTO: string },
  tallaDimsPant?: { ALTO: string; ANCHO: string; MANGA_ANCHO: string; MANGA_ALTO: string },
) {
  const notes: string[] = [];

  if (productId === 'por_cm') {
    const heightCm = Math.max(0, linearCm ?? 0);
    const effectiveWidth = widthCm !== undefined ? widthCm : plotterWidthCm;
    const widthRatio = plotterWidthCm > 0 ? effectiveWidth / plotterWidthCm : 1;
    return { meters: (heightCm / 100) * widthRatio, camisetaMeters: 0, pantalonetaMeters: 0, source: 'real' as const, notes };
  }

  const dimsShirtMeters = tallaDims ? calcShirtMetersFromDims(tallaDims, plotterWidthCm) : 0;
  const dimsValid = tallaDims && dimsShirtMeters > 0;
  const sm = getSizeMeasurement(size);
  const fallbackMeters = calcShirtMetersFromDims(
    { ALTO: String(sm.torsoHeightCm), ANCHO: String(sm.torsoWidthCm),
      MANGA_ANCHO: String(sm.sleeveWidthCm), MANGA_ALTO: String(sm.sleeveHeightCm) },
    plotterWidthCm,
  );
  const shirtMeters = dimsValid ? dimsShirtMeters : fallbackMeters;
  if (tallaDims && !dimsValid) notes.push('Dims configuradas incompletas — usando tabla por defecto.');
  const source = dimsValid ? 'real' as const : 'estimated' as const;

  if (productId === 'camiseta') {
    return { meters: shirtMeters, camisetaMeters: shirtMeters, pantalonetaMeters: 0, source, notes };
  }

  // ratio físico de metros pantaloneta vs camiseta — independiente de precios de venta
  const ratio = 0.65;

  if (productId === 'pantaloneta') {
    if (tallaDims) {
      const pMeters = calcShirtMetersFromDims(tallaDims, plotterWidthCm);
      if (pMeters > 0) {
        return { meters: pMeters, camisetaMeters: 0, pantalonetaMeters: pMeters, source: 'real' as const, notes };
      }
      notes.push('Dims pantaloneta incompletas — usando tabla por defecto.');
    }
    if (!tallaDims) notes.push('Pantaloneta estimada por proporcion hasta configurar medidas reales.');
    const pMeters = shirtMeters * ratio;
    return { meters: pMeters, camisetaMeters: 0, pantalonetaMeters: pMeters, source: 'estimated' as const, notes };
  }

  // equipo: camiseta usa dims reales si disponible; pantaloneta usa dims pant si disponible, si no ratio
  if (!dimsValid || !tallaDimsPant) notes.push('Equipo usa camiseta real + pantaloneta estimada.');
  const dimsPantMeters = tallaDimsPant ? calcShirtMetersFromDims(tallaDimsPant, plotterWidthCm) : 0;
  const pMeters = dimsPantMeters > 0 ? dimsPantMeters : shirtMeters * ratio;
  return {
    meters: shirtMeters + pMeters,
    camisetaMeters: shirtMeters,
    pantalonetaMeters: pMeters,
    source: (dimsValid && dimsPantMeters > 0) ? 'real' as const : 'estimated' as const,
    notes,
  };
}

export function calculateCost(input: {
  productId: ProductId;
  segment: CustomerSegment;
  gender: Gender;
  size: number;
  quantity: number;
  profileId: PrintProfileId;
  profiles: PrintProfile[];
  basePrices: BasePrice[];
  supplies: Supply[];
  machines: MachineCost[];
  operations: OperationCost[];
  linearCm?: number;
  widthCm?: number;
  physicalSizeId?: string;
  config: PricingConfig;
  tallaDims?: { ALTO: string; ANCHO: string; MANGA_ANCHO: string; MANGA_ALTO: string };
  tallaDimsPant?: { ALTO: string; ANCHO: string; MANGA_ANCHO: string; MANGA_ALTO: string };
  serviceMode?: 'sublimation' | 'full_service' | 'paper';
  fabrics?: FabricType[];
  selectedFabricIdCamiseta?: string | null;
  selectedFabricIdPantaloneta?: string | null;
}): CostBreakdown {
  // Derive active plotter width
  const activePlotter = (input.config.plotters ?? []).find(p => p.id === input.config.selectedPlotterId);
  const effectivePlotterWidth = activePlotter?.widthCm ?? input.config.rollWidthCm;

  // Derive active press
  const activePress = (input.config.presses ?? []).find(p => p.id === input.config.selectedPressId);

  // Supplies billed per-bajada are excluded from per-meter cost (computed separately below)
  const perBajadaIds = activePress ? (input.config.perBajadaSupplyIds ?? []) : [];

  const costPerMeter = getCostPerMeter(input.profileId, input.config, input.supplies, input.machines, input.operations, input.profiles, perBajadaIds);
  // baseline is always inkFactor=1 (full ink), independent of which profile is 'normal'
  const normalCostPerMeter = computeCostWithInkFactor(1, input.config, input.supplies, input.machines, input.operations, perBajadaIds);
  const productMeters = getMetersForProduct(
    input.productId, input.basePrices, input.segment, input.gender, input.size,
    effectivePlotterWidth, input.linearCm, input.widthCm, input.tallaDims, input.tallaDimsPant,
  );
  const wasteRate = input.config.wasteRate;
  const metersUnit = productMeters.meters * (1 + wasteRate);
  const printCostPerUnit = roundMoney(metersUnit * costPerMeter);
  const normalPrintCostPerUnit = roundMoney(metersUnit * normalCostPerMeter);

  // ── Servicio completo ──────────────────────────────────────
  const isFullService = input.serviceMode === 'full_service';
  const fabrics = input.fabrics ?? [];

  let fabricCostPerUnit = 0;
  let tailoringCostPerUnit = 0;
  let polinesCostPerUnit = 0;

  if (isFullService) {
    const fabricC = fabrics.find(f => f.id === input.selectedFabricIdCamiseta);
    const fabricP = fabrics.find(f => f.id === input.selectedFabricIdPantaloneta);
    const effC = fabricC ? fabricC.metersPerKg * (fabricC.tubular ? 2 : 1) : 0;
    const effP = fabricP ? fabricP.metersPerKg * (fabricP.tubular ? 2 : 1) : 0;
    const priceC = effC > 0 ? fabricC!.costPerKg / effC : 0;
    const priceP = effP > 0 ? fabricP!.costPerKg / effP : 0;

    const { productId } = input;
    if (productId === 'camiseta') {
      fabricCostPerUnit = roundMoney(metersUnit * priceC);
      tailoringCostPerUnit = input.config.tailoringCamiseta ?? 0;
    } else if (productId === 'pantaloneta') {
      fabricCostPerUnit = roundMoney(metersUnit * priceP);
      tailoringCostPerUnit = input.config.tailoringPantaloneta ?? 0;
    } else if (productId === 'equipo') {
      const cM = productMeters.camisetaMeters * (1 + wasteRate);
      const pM = productMeters.pantalonetaMeters * (1 + wasteRate);
      fabricCostPerUnit = roundMoney(cM * priceC + pM * priceP);
      tailoringCostPerUnit = (input.config.tailoringCamiseta ?? 0) + (input.config.tailoringPantaloneta ?? 0);
    }
    polinesCostPerUnit = input.config.polinesCost ?? 0;
  }

  // ── Planchado ──────────────────────────────────────────────────
  let pressBajadas = 0;
  if (activePress && input.productId === 'por_cm') {
    const physSize = PHYSICAL_SIZES.find(s => s.id === input.physicalSizeId);
    const pw = physSize ? physSize.widthCm  : (input.widthCm  ?? 0);
    const ph = physSize ? physSize.heightCm : (input.linearCm ?? 0);
    const piecesPerBajada = pw > 0 && ph > 0 ? calcPiecesPerBajada(pw, ph, activePress) : 1;
    pressBajadas = 1 / piecesPerBajada;
  } else if (activePress && input.productId !== 'por_cm') {
    if (input.tallaDims) {
      pressBajadas = calcBajadasDePlancha(input.tallaDims, activePress);
    } else {
      try {
        const sm = getSizeMeasurement(input.size);
        pressBajadas = calcBajadasFromSizeMeasurement(sm, activePress);
      } catch {
        pressBajadas = 0;
      }
    }
    if (input.productId === 'equipo') {
      const pantDims = input.tallaDimsPant ?? input.tallaDims;
      const pantBajadas = pantDims
        ? calcBajadasDePlancha(pantDims, activePress)
        : pressBajadas;
      pressBajadas += pantBajadas;
    }
  }

  // Press depreciation + per-bajada supplies (e.g. papel periódico), all × bajadas
  let pressCostPerUnit = 0;
  if (activePress && pressBajadas > 0) {
    const pressDepreciation = activePress.lifeBajadas > 0
      ? (activePress.cost / activePress.lifeBajadas) * pressBajadas : 0;
    const paperCost = input.supplies
      .filter(s => perBajadaIds.includes(s.id) && s.quantity > 0)
      .reduce((sum, s) => {
        const cpm = s.totalCost / s.quantity;
        const sheets = activePress.paperSheetsPerBajada ?? 2;
        return sum + cpm * sheets * pressBajadas;
      }, 0);
    pressCostPerUnit = roundMoney(pressDepreciation + paperCost);
  }

  const monthlyUnits = (input.config.monthlyUnits ?? 0) > 0 ? input.config.monthlyUnits : 1;
  const opsBase = roundMoney(input.operations.reduce((s, o) => s + o.monthlyCost, 0) / monthlyUnits);
  let opsCostPerUnit: number;
  if (input.productId === 'por_cm') {
    if (activePress) {
      const physSize = PHYSICAL_SIZES.find(s => s.id === input.physicalSizeId);
      const pw = physSize ? physSize.widthCm  : (input.widthCm  ?? 0);
      const ph = physSize ? physSize.heightCm : (input.linearCm ?? 0);
      if (pw > 0 && ph > 0) {
        const piecesPerBajada = calcPiecesPerBajada(pw, ph, activePress);
        opsCostPerUnit = roundMoney(opsBase / piecesPerBajada);
      } else {
        opsCostPerUnit = 0;
      }
    } else {
      opsCostPerUnit = 0;
    }
  } else if (input.productId === 'equipo') {
    opsCostPerUnit = roundMoney(opsBase * 2);
  } else {
    opsCostPerUnit = opsBase;
  }
  const unitCost = roundMoney(printCostPerUnit + pressCostPerUnit + fabricCostPerUnit + tailoringCostPerUnit + polinesCostPerUnit + opsCostPerUnit);

  return {
    profileId: input.profileId,
    costPerMeter,
    normalCostPerMeter,
    metersUnit,
    printCostPerUnit,
    fabricCostPerUnit,
    tailoringCostPerUnit,
    polinesCostPerUnit,
    pressBajadas,
    pressCostPerUnit,
    opsCostPerUnit,
    unitCost,
    totalCost: roundMoney(unitCost * input.quantity),
    savingsPerUnit: Math.max(0, roundMoney(normalPrintCostPerUnit - printCostPerUnit)),
    measurementSource: productMeters.source,
    notes: productMeters.notes,
  };
}
