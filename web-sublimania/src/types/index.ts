// ============================================================
//  types/index.ts — Única fuente de verdad para tipos
// ============================================================

// ── JUGADOR (columnas fijas del Excel) ────────────────────────
export interface Player {
  NOMBRE: string;
  NOMBRE_CAMISETA: string;
  NUMERO: string;
  TALLA: string;
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
}

export interface SchemaPieza {
  label: string;
  color: string;
  elements: SchemaElement[];
}

export type Schema = Record<string, SchemaPieza>;

// ── TEAM ENTRY (registro completo de un equipo) ───────────────
export interface TeamEntry {
  id: string;
  nombre: string;         // display name (= globalConfig.EQUIPO al crear)
  createdAt: string;      // ISO
  updatedAt: string;      // ISO
  players: Player[];
  tallas: string[];
  tallaRules: Record<string, Rules>;
  overrides: Overrides;
  globalConfig: GlobalConfig;
  exportHistory: Record<string, { exportedAt: string }>; // talla → fecha
}

// ── TALLAS ESTÁNDAR (dimensiones globales por talla) ──────────
export interface TallaDims {
  ALTO: string;
  ANCHO: string;
  MANGA_ANCHO: string;
  MANGA_ALTO: string;
  MANGA_RANGLAN_ANCHO: string;
  MANGA_RANGLAN_ALTO: string;
}

// ── CLIENTE (costurera) ───────────────────────────────────────
export interface Cliente {
  id: string;
  nombre: string;
  casaCosturera: string;
}

// ── PANTALLAS ─────────────────────────────────────────────────
export type Screen = 'teams' | 'upload' | 'configure' | 'export' | 'settings';
export type ConfigTab = 'rules' | 'players';
export type SettingsTab = 'clientes' | 'tallas' | 'users';
export type PiezaKey = 'frente' | 'espalda' | 'manga_izq' | 'manga_der';
