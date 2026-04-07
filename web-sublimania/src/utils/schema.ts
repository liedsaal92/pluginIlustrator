// ============================================================
//  utils/schema.ts — Definición del schema de piezas y campos
// ============================================================
import type { Schema, SchemaField, GlobalConfig, Rules } from '../types';

const REF_OPTIONS = ['PROPORCIONAL', 'ANCHO', 'ALTO'];
const LADO_OPTIONS = ['IZQ', 'DER'];

// Columnas fijas del Excel (no configurables por reglas)
export const PLAYER_KEYS = ['NOMBRE', 'NOMBRE_CAMISETA', 'NUMERO', 'TALLA'];

// Orden exacto de columnas del CSV final
export const CSV_COLUMN_ORDER: string[] = [
  'NOMBRE', 'NOMBRE_CAMISETA', 'NUMERO', 'TIENE_NUMERO', 'TALLA', 'ALTO', 'ANCHO',
  'MANGA_ALTO', 'MANGA_ANCHO', 'EQUIPO', 'NOTAS',
  // FRENTE — NOMBRE
  'LLEVA_NOMBRE_F', 'NOMBRE_F_ANCHO', 'NOMBRE_F_ALTO', 'NOMBRE_F_REF',
  // FRENTE — NÚMERO
  'LLEVA_NUMERO_F', 'NUMERO_FRENTE_ANCHO', 'NUMERO_FRENTE_ALTO', 'NUMERO_FRENTE_REF',
  // FRENTE — ESCUDO
  'LLEVA_ESCUDO_F', 'ESCUDO_F_ANCHO', 'ESCUDO_F_ALTO', 'ESCUDO_F_REF',
  // FRENTE — ESCUDO CENTRAL
  'LLEVA_ESCUDO_CENTRAL', 'ESCUDO_CENTRAL_ANCHO', 'ESCUDO_CENTRAL_ALTO', 'ESCUDO_CENTRAL_REF',
  // FRENTE — LOGO MARCA
  'LLEVA_LOGO_MARCA', 'LOGO_MARCA_ANCHO', 'LOGO_MARCA_ALTO', 'LOGO_MARCA_REF',
  // FRENTE — SPONSORS TOP
  'LLEVA_SPONSOR_TOP_IZQ', 'SPONSOR_TOP_IZQ_ANCHO', 'SPONSOR_TOP_IZQ_ALTO', 'SPONSOR_TOP_IZQ_REF',
  'LLEVA_SPONSOR_TOP_DER', 'SPONSOR_TOP_DER_ANCHO', 'SPONSOR_TOP_DER_ALTO', 'SPONSOR_TOP_DER_REF',
  // FRENTE — SPONSOR PRINCIPAL / SECUNDARIO
  'LLEVA_SPONSOR_PRINCIPAL_F', 'SPONSOR_PRINCIPAL_F_ANCHO', 'SPONSOR_PRINCIPAL_F_ALTO', 'SPONSOR_PRINCIPAL_F_REF',
  'LLEVA_SPONSOR_SECUNDARIO_F', 'SPONSOR_SECUNDARIO_F_ANCHO', 'SPONSOR_SECUNDARIO_F_ALTO', 'SPONSOR_SECUNDARIO_F_REF',
  // FRENTE — COSTILLA
  'LLEVA_COSTILLA_F', 'COSTILLA_F_ANCHO', 'COSTILLA_F_ALTO', 'COSTILLA_F_REF',
  // FRENTE — ETIQUETA PRINCIPAL
  'LLEVA_ETIQUETA_PRINCIPAL_F', 'ETIQUETA_PRINCIPAL_F_ANCHO', 'ETIQUETA_PRINCIPAL_F_ALTO', 'ETIQUETA_PRINCIPAL_F_REF',
  'ETIQUETA_PRINCIPAL_F_MARGIN_INF', 'ETIQUETA_PRINCIPAL_F_MARGIN_LAT', 'ETIQUETA_PRINCIPAL_F_LADO',
  // FRENTE — ETIQUETA SECUNDARIA
  'LLEVA_ETIQUETA_SECUNDARIA_F', 'ETIQUETA_SECUNDARIA_F_ANCHO', 'ETIQUETA_SECUNDARIA_F_ALTO', 'ETIQUETA_SECUNDARIA_F_REF',
  'ETIQUETA_SECUNDARIA_F_MARGIN_INF', 'ETIQUETA_SECUNDARIA_F_MARGIN_LAT', 'ETIQUETA_SECUNDARIA_F_LADO',
  // ESPALDA — NOMBRE
  'LLEVA_NOMBRE_E', 'NOMBRE_E_ANCHO', 'NOMBRE_E_ALTO', 'NOMBRE_E_REF',
  // ESPALDA — NÚMERO
  'LLEVA_NUMERO_E', 'NUMERO_ESPALDA_ANCHO', 'NUMERO_ESPALDA_ALTO', 'NUMERO_ESPALDA_REF',
  // ESPALDA — ETIQUETA TOP
  'LLEVA_ETIQUETA_TOP', 'ETIQUETA_TOP_ANCHO', 'ETIQUETA_TOP_ALTO', 'ETIQUETA_TOP_REF',
  // ESPALDA — ETIQUETA PRINCIPAL
  'LLEVA_ETIQUETA_PRINCIPAL_E', 'ETIQUETA_PRINCIPAL_E_ANCHO', 'ETIQUETA_PRINCIPAL_E_ALTO', 'ETIQUETA_PRINCIPAL_E_REF',
  'ETIQUETA_PRINCIPAL_E_MARGIN_INF', 'ETIQUETA_PRINCIPAL_E_MARGIN_LAT', 'ETIQUETA_PRINCIPAL_E_LADO',
  // ESPALDA — ETIQUETA SECUNDARIA
  'LLEVA_ETIQUETA_SECUNDARIA_E', 'ETIQUETA_SECUNDARIA_E_ANCHO', 'ETIQUETA_SECUNDARIA_E_ALTO', 'ETIQUETA_SECUNDARIA_E_REF',
  'ETIQUETA_SECUNDARIA_E_MARGIN_INF', 'ETIQUETA_SECUNDARIA_E_MARGIN_LAT', 'ETIQUETA_SECUNDARIA_E_LADO',
  // ESPALDA — SPONSOR PRINCIPAL / SECUNDARIO
  'LLEVA_SPONSOR_PRINCIPAL_E', 'SPONSOR_PRINCIPAL_E_ANCHO', 'SPONSOR_PRINCIPAL_E_ALTO', 'SPONSOR_PRINCIPAL_E_REF',
  'LLEVA_SPONSOR_SECUNDARIO_E', 'SPONSOR_SECUNDARIO_E_ANCHO', 'SPONSOR_SECUNDARIO_E_ALTO', 'SPONSOR_SECUNDARIO_E_REF',
  // ESPALDA — COSTILLA
  'LLEVA_COSTILLA_E', 'COSTILLA_E_ANCHO', 'COSTILLA_E_ALTO', 'COSTILLA_E_REF',
  // MANGA — NÚMERO
  'LLEVA_NUMERO_M', 'NUMERO_M_ANCHO', 'NUMERO_M_ALTO', 'NUMERO_M_REF',
  // MANGA — ESCUDO / SPONSOR
  'LLEVA_ESCUDO_M', 'ESCUDO_M_ANCHO', 'ESCUDO_M_ALTO', 'ESCUDO_M_REF',
  'LLEVA_SPONSOR_SECUNDARIO_M', 'SPONSOR_SECUNDARIO_M_ANCHO', 'SPONSOR_SECUNDARIO_M_ALTO', 'SPONSOR_SECUNDARIO_M_REF',
  // MANGA — LÍNEAS
  'LLEVA_MANGA_LINEA_IZQ', 'MANGA_LINEA_IZQ_ANCHO', 'MANGA_LINEA_IZQ_ALTO', 'MANGA_LINEA_IZQ_REF',
  'LLEVA_MANGA_LINEA_DER', 'MANGA_LINEA_DER_ANCHO', 'MANGA_LINEA_DER_ALTO', 'MANGA_LINEA_DER_REF',
  'LLEVA_MANGA_LINEA_INF', 'MANGA_LINEA_INF_ANCHO', 'MANGA_LINEA_INF_ALTO', 'MANGA_LINEA_INF_REF',
  // MANGA — POSICIONAMIENTO
  'MANGA_MARGIN_INF', 'MANGA_MARGIN_ESCUDO',
];

const numField = (key: string, label: string): SchemaField => ({
  key, label, type: 'number', unit: 'cm',
});
const refField = (key: string): SchemaField => ({
  key, label: 'Ref', type: 'select', options: REF_OPTIONS,
});

export const SCHEMA: Schema = {
  frente: {
    label: 'FRENTE',
    color: '#E8462A',
    elements: [
      { id: 'nombre_f', label: 'NOMBRE', icon: '✦', toggleKey: 'LLEVA_NOMBRE_F',
        fields: [numField('NOMBRE_F_ANCHO', 'Ancho'), numField('NOMBRE_F_ALTO', 'Alto'), refField('NOMBRE_F_REF')] },
      { id: 'numero_f', label: 'NÚMERO', icon: '#', toggleKey: 'LLEVA_NUMERO_F',
        fields: [numField('NUMERO_FRENTE_ANCHO', 'Ancho'), numField('NUMERO_FRENTE_ALTO', 'Alto'), refField('NUMERO_FRENTE_REF')] },
      { id: 'escudo_f', label: 'ESCUDO', icon: '⬡', toggleKey: 'LLEVA_ESCUDO_F',
        fields: [numField('ESCUDO_F_ANCHO', 'Ancho'), numField('ESCUDO_F_ALTO', 'Alto'), refField('ESCUDO_F_REF')] },
      { id: 'escudo_central', label: 'ESCUDO CENTRAL', icon: '⬡', toggleKey: 'LLEVA_ESCUDO_CENTRAL',
        fields: [numField('ESCUDO_CENTRAL_ANCHO', 'Ancho'), numField('ESCUDO_CENTRAL_ALTO', 'Alto'), refField('ESCUDO_CENTRAL_REF')] },
      { id: 'logo_marca', label: 'LOGO MARCA', icon: '◈', toggleKey: 'LLEVA_LOGO_MARCA',
        fields: [numField('LOGO_MARCA_ANCHO', 'Ancho'), numField('LOGO_MARCA_ALTO', 'Alto'), refField('LOGO_MARCA_REF')] },
      { id: 'sponsor_top_izq', label: 'SPONSOR TOP IZQ', icon: '◧', toggleKey: 'LLEVA_SPONSOR_TOP_IZQ',
        fields: [numField('SPONSOR_TOP_IZQ_ANCHO', 'Ancho'), numField('SPONSOR_TOP_IZQ_ALTO', 'Alto'), refField('SPONSOR_TOP_IZQ_REF')] },
      { id: 'sponsor_top_der', label: 'SPONSOR TOP DER', icon: '◨', toggleKey: 'LLEVA_SPONSOR_TOP_DER',
        fields: [numField('SPONSOR_TOP_DER_ANCHO', 'Ancho'), numField('SPONSOR_TOP_DER_ALTO', 'Alto'), refField('SPONSOR_TOP_DER_REF')] },
      { id: 'sponsor_principal_f', label: 'SPONSOR PRINCIPAL', icon: '★', toggleKey: 'LLEVA_SPONSOR_PRINCIPAL_F',
        fields: [numField('SPONSOR_PRINCIPAL_F_ANCHO', 'Ancho'), numField('SPONSOR_PRINCIPAL_F_ALTO', 'Alto'), refField('SPONSOR_PRINCIPAL_F_REF')] },
      { id: 'sponsor_secundario_f', label: 'SPONSOR SECUNDARIO', icon: '☆', toggleKey: 'LLEVA_SPONSOR_SECUNDARIO_F',
        fields: [numField('SPONSOR_SECUNDARIO_F_ANCHO', 'Ancho'), numField('SPONSOR_SECUNDARIO_F_ALTO', 'Alto'), refField('SPONSOR_SECUNDARIO_F_REF')] },
      { id: 'costilla_f', label: 'COSTILLA', icon: '|||', toggleKey: 'LLEVA_COSTILLA_F',
        fields: [numField('COSTILLA_F_ANCHO', 'Ancho'), numField('COSTILLA_F_ALTO', 'Alto'), refField('COSTILLA_F_REF')] },
      { id: 'etiqueta_principal_f', label: 'ETIQUETA PRINCIPAL', icon: '⬚', toggleKey: 'LLEVA_ETIQUETA_PRINCIPAL_F',
        fields: [
          numField('ETIQUETA_PRINCIPAL_F_ANCHO', 'Ancho'), numField('ETIQUETA_PRINCIPAL_F_ALTO', 'Alto'), refField('ETIQUETA_PRINCIPAL_F_REF'),
          numField('ETIQUETA_PRINCIPAL_F_MARGIN_INF', 'Margen inf'), numField('ETIQUETA_PRINCIPAL_F_MARGIN_LAT', 'Margen lat'),
          { key: 'ETIQUETA_PRINCIPAL_F_LADO', label: 'Lado', type: 'select', options: LADO_OPTIONS },
        ] },
      { id: 'etiqueta_secundaria_f', label: 'ETIQUETA SECUNDARIA', icon: '⬙', toggleKey: 'LLEVA_ETIQUETA_SECUNDARIA_F',
        fields: [
          numField('ETIQUETA_SECUNDARIA_F_ANCHO', 'Ancho'), numField('ETIQUETA_SECUNDARIA_F_ALTO', 'Alto'), refField('ETIQUETA_SECUNDARIA_F_REF'),
          numField('ETIQUETA_SECUNDARIA_F_MARGIN_INF', 'Margen inf'), numField('ETIQUETA_SECUNDARIA_F_MARGIN_LAT', 'Margen lat'),
          { key: 'ETIQUETA_SECUNDARIA_F_LADO', label: 'Lado', type: 'select', options: LADO_OPTIONS },
        ] },
    ],
  },

  espalda: {
    label: 'ESPALDA',
    color: '#F5C842',
    elements: [
      { id: 'nombre_e', label: 'NOMBRE', icon: '✦', toggleKey: 'LLEVA_NOMBRE_E',
        fields: [numField('NOMBRE_E_ANCHO', 'Ancho'), numField('NOMBRE_E_ALTO', 'Alto'), refField('NOMBRE_E_REF')] },
      { id: 'numero_e', label: 'NÚMERO', icon: '#', toggleKey: 'LLEVA_NUMERO_E',
        fields: [numField('NUMERO_ESPALDA_ANCHO', 'Ancho'), numField('NUMERO_ESPALDA_ALTO', 'Alto'), refField('NUMERO_ESPALDA_REF')] },
      { id: 'etiqueta_top', label: 'ETIQUETA TOP', icon: '⬒', toggleKey: 'LLEVA_ETIQUETA_TOP',
        fields: [numField('ETIQUETA_TOP_ANCHO', 'Ancho'), numField('ETIQUETA_TOP_ALTO', 'Alto'), refField('ETIQUETA_TOP_REF')] },
      { id: 'etiqueta_principal_e', label: 'ETIQUETA PRINCIPAL', icon: '⬚', toggleKey: 'LLEVA_ETIQUETA_PRINCIPAL_E',
        fields: [
          numField('ETIQUETA_PRINCIPAL_E_ANCHO', 'Ancho'), numField('ETIQUETA_PRINCIPAL_E_ALTO', 'Alto'), refField('ETIQUETA_PRINCIPAL_E_REF'),
          numField('ETIQUETA_PRINCIPAL_E_MARGIN_INF', 'Margen inf'), numField('ETIQUETA_PRINCIPAL_E_MARGIN_LAT', 'Margen lat'),
          { key: 'ETIQUETA_PRINCIPAL_E_LADO', label: 'Lado', type: 'select', options: LADO_OPTIONS },
        ] },
      { id: 'etiqueta_secundaria_e', label: 'ETIQUETA SECUNDARIA', icon: '⬙', toggleKey: 'LLEVA_ETIQUETA_SECUNDARIA_E',
        fields: [
          numField('ETIQUETA_SECUNDARIA_E_ANCHO', 'Ancho'), numField('ETIQUETA_SECUNDARIA_E_ALTO', 'Alto'), refField('ETIQUETA_SECUNDARIA_E_REF'),
          numField('ETIQUETA_SECUNDARIA_E_MARGIN_INF', 'Margen inf'), numField('ETIQUETA_SECUNDARIA_E_MARGIN_LAT', 'Margen lat'),
          { key: 'ETIQUETA_SECUNDARIA_E_LADO', label: 'Lado', type: 'select', options: LADO_OPTIONS },
        ] },
      { id: 'sponsor_principal_e', label: 'SPONSOR PRINCIPAL', icon: '★', toggleKey: 'LLEVA_SPONSOR_PRINCIPAL_E',
        fields: [numField('SPONSOR_PRINCIPAL_E_ANCHO', 'Ancho'), numField('SPONSOR_PRINCIPAL_E_ALTO', 'Alto'), refField('SPONSOR_PRINCIPAL_E_REF')] },
      { id: 'sponsor_secundario_e', label: 'SPONSOR SECUNDARIO', icon: '☆', toggleKey: 'LLEVA_SPONSOR_SECUNDARIO_E',
        fields: [numField('SPONSOR_SECUNDARIO_E_ANCHO', 'Ancho'), numField('SPONSOR_SECUNDARIO_E_ALTO', 'Alto'), refField('SPONSOR_SECUNDARIO_E_REF')] },
      { id: 'costilla_e', label: 'COSTILLA', icon: '|||', toggleKey: 'LLEVA_COSTILLA_E',
        fields: [numField('COSTILLA_E_ANCHO', 'Ancho'), numField('COSTILLA_E_ALTO', 'Alto'), refField('COSTILLA_E_REF')] },
    ],
  },

  manga_izq: {
    label: 'MANGA IZQ',
    color: '#4A9BE8',
    elements: [
      { id: 'numero_m', label: 'NÚMERO', icon: '#', toggleKey: 'LLEVA_NUMERO_M',
        fields: [numField('NUMERO_M_ANCHO', 'Ancho'), numField('NUMERO_M_ALTO', 'Alto'), refField('NUMERO_M_REF')] },
      { id: 'escudo_m', label: 'ESCUDO', icon: '⬡', toggleKey: 'LLEVA_ESCUDO_M',
        fields: [numField('ESCUDO_M_ANCHO', 'Ancho'), numField('ESCUDO_M_ALTO', 'Alto'), refField('ESCUDO_M_REF')] },
      { id: 'sponsor_secundario_m', label: 'SPONSOR SECUNDARIO', icon: '☆', toggleKey: 'LLEVA_SPONSOR_SECUNDARIO_M',
        fields: [numField('SPONSOR_SECUNDARIO_M_ANCHO', 'Ancho'), numField('SPONSOR_SECUNDARIO_M_ALTO', 'Alto'), refField('SPONSOR_SECUNDARIO_M_REF')] },
      { id: 'linea_izq', label: 'LÍNEA LATERAL IZQ', icon: '|', toggleKey: 'LLEVA_MANGA_LINEA_IZQ',
        fields: [numField('MANGA_LINEA_IZQ_ANCHO', 'Ancho'), numField('MANGA_LINEA_IZQ_ALTO', 'Alto'), refField('MANGA_LINEA_IZQ_REF')] },
      { id: 'linea_der', label: 'LÍNEA LATERAL DER', icon: '|', toggleKey: 'LLEVA_MANGA_LINEA_DER',
        fields: [numField('MANGA_LINEA_DER_ANCHO', 'Ancho'), numField('MANGA_LINEA_DER_ALTO', 'Alto'), refField('MANGA_LINEA_DER_REF')] },
      { id: 'linea_inf', label: 'LÍNEA INFERIOR', icon: '—', toggleKey: 'LLEVA_MANGA_LINEA_INF',
        fields: [numField('MANGA_LINEA_INF_ANCHO', 'Ancho'), numField('MANGA_LINEA_INF_ALTO', 'Alto'), refField('MANGA_LINEA_INF_REF')] },
      { id: 'manga_posicion', label: 'POSICIONAMIENTO', icon: '⊹', toggleKey: null,
        fields: [numField('MANGA_MARGIN_INF', 'Margen inf'), numField('MANGA_MARGIN_ESCUDO', 'Margen escudo')] },
    ],
  },

  manga_der: {
    label: 'MANGA DER',
    color: '#7B5CF0',
    elements: [], // se asigna abajo — comparte con manga_izq
  },
};

// MANGA_DER comparte los mismos elementos que MANGA_IZQ
SCHEMA.manga_der.elements = SCHEMA.manga_izq.elements;

// Campos globales
export const GLOBAL_FIELDS: Array<{ key: keyof GlobalConfig; label: string; placeholder: string }> = [
  { key: 'EQUIPO', label: 'Equipo', placeholder: 'Atlas FC' },
  { key: 'NOTAS',  label: 'Notas',  placeholder: 'Observaciones...' },
];

export function buildEmptyRules(): Rules {
  const out: Rules = {};
  Object.values(SCHEMA).forEach(pieza => {
    pieza.elements.forEach(el => {
      if (el.toggleKey) out[el.toggleKey] = 'NO';
      el.fields.forEach(f => { out[f.key] = ''; });
    });
  });
  return out;
}

export function getDefaultGlobal(): GlobalConfig {
  return { EQUIPO: '', NOTAS: '' };
}

// Tallas estándar — siempre visibles en la pantalla de exportación
export const TALLAS_ESTANDAR = [
  '24H','26H','28H','30H','32H','34H','35H','36H','38H','40H','42H','44H',
  '24M','26M','28M','30M','32M','34M','35M','36M','38M','40M','42M','44M',
];
