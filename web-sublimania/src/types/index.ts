// ============================================================
//  types/index.ts — Única fuente de verdad para tipos
// ============================================================

// ── JUGADOR (columnas fijas del Excel) ────────────────────────
export interface Player {
  NOMBRE: string;
  NOMBRE_CAMISETA: string;
  NUMERO: string;
  TALLA: string;
  ALTO: string;
  ANCHO: string;
  MANGA_ALTO: string;
  MANGA_ANCHO: string;
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

// ── PANTALLAS ─────────────────────────────────────────────────
export type Screen = 'upload' | 'configure' | 'export';
export type ConfigTab = 'rules' | 'players';
export type PiezaKey = 'frente' | 'espalda' | 'manga_izq' | 'manga_der';
