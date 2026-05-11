// ============================================================
//  types/index.ts — Única fuente de verdad para tipos
// ============================================================

// ── JUGADOR (columnas fijas del Excel) ────────────────────────
export interface Player {
  NOMBRE: string;
  NOMBRE_CAMISETA: string;
  NUMERO: string;
  TALLA_CAMI: string;
  TALLA_PANT: string;
}

// ── REGLAS (valores configurables por talla o por jugador) ────
export type RuleValue = string; // número como string ("8.00") o "SI"/"NO" o "PROPORCIONAL" etc.
export type Rules = Record<string, RuleValue>;

// ── OVERRIDES (índice de jugador → reglas parciales) ──────────
export type Overrides = Record<number, Rules>;

// ── CONFIG GLOBAL ─────────────────────────────────────────────
export interface GlobalConfig {
  EQUIPO: string;
  NOTAS: string;
  clienteIdPant: string; // cliente activo para tallas de pantaloneta
  moldeIdPant:   string; // molde pantaloneta activo para este equipo
}

// ── SCHEMA ────────────────────────────────────────────────────
export type RefOption = 'PROPORCIONAL' | 'ANCHO' | 'ALTO';
export type LadoOption = 'IZQ' | 'DER';
export type FieldType = 'number' | 'select' | 'text';

export interface SchemaField {
  key: string;
  label: string;
  type: FieldType;
  unit?: string;
  options?: string[];
}

export interface SchemaElement {
  id: string;
  label: string;
  icon: string;
  toggleKey: string | null;
  fields: SchemaField[];
  group?: string;
}

export interface SchemaPieza {
  label: string;
  color: string;
  elements: SchemaElement[];
  category?: 'camiseta' | 'pantaloneta';
}

export type Schema = Record<string, SchemaPieza>;

// ── TEAM ENTRY (registro completo de un equipo) ───────────────
export interface TeamEntry {
  id: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
  players: Player[];
  tallas: string[];
  tallaRules: Record<string, Rules>;
  overrides: Overrides;
  globalConfig: GlobalConfig;
  exportHistory: Record<string, { exportedAt: string }>;
  portalStatus: PortalStatus;
  createdBy:    string | null;
  portalToken:  string | null;
  portalExpiry: string | null;
}

// ── TALLAS ESTÁNDAR (dimensiones globales por talla) ──────────
export interface TallaDims {
  ALTO: string;
  ANCHO: string;
  MANGA_ANCHO: string;
  MANGA_ALTO: string;
}

// ── CLIENTE (costurera) ───────────────────────────────────────
export interface Cliente {
  id: string;
  nombre: string;
  casaCosturera: string;
}

// ── MOLDE (tipo de prenda) ────────────────────────────────────
export interface Molde {
  id: string;
  nombre: string;
  tipo?: 'camiseta' | 'pantaloneta'; // resuelto por useMoldeTiposStore (localStorage)
}

// ── PORTAL ────────────────────────────────────────────────────
export type PortalStatus = 'none' | 'collecting' | 'approved';
export type PlayerStatus = 'confirmed' | 'pending' | 'additional';

export interface PortalLink {
  token:     string;
  teamId:    string;
  orgId:     string;
  status:    'open' | 'approved' | 'closed';
  expiresAt: string | null;
  createdAt: string;
}

export interface PortalInfo {
  teamNombre:  string;
  expiresAt:   string | null;
  status:      'open' | 'approved' | 'closed';
  playerCount: number;
}

// ── TIPO DE CLIENTE ───────────────────────────────────────────
export interface TipoCliente {
  id: string;
  nombre: string;
  segmento: 'normal' | 'vip';
}

// ── PANTALLAS ─────────────────────────────────────────────────
export type Screen = 'teams' | 'upload' | 'configure' | 'export' | 'preview' | 'settings' | 'pricing_cotizador' | 'pricing_costos' | 'pricing_tablas' | 'pricing_mercado' | 'pricing_tabla_cliente' | 'pricing_dashboard';
export type ConfigTab = 'rules' | 'pantaloneta' | 'players';
export type SettingsTab = 'clientes' | 'tallas' | 'moldes' | 'tipos' | 'users';
export type PiezaKey = 'frente' | 'espalda' | 'manga_izq' | 'manga_der' | 'pant_izq' | 'pant_der';
