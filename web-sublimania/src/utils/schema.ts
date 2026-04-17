// ============================================================
//  utils/schema.ts — Definición del schema de piezas y campos
// ============================================================
import type { Schema, SchemaField, GlobalConfig, Rules } from '../types';

const REF_OPTIONS = ['PROPORCIONAL', 'ANCHO', 'ALTO', 'AMBOS'];
const LADO_OPTIONS = ['IZQ', 'DER'];

// Columnas fijas del Excel (no configurables por reglas)
export const PLAYER_KEYS = ['NOMBRE', 'NOMBRE_CAMISETA', 'NUMERO', 'TALLA'];

// Orden exacto de columnas del CSV final
export const CSV_COLUMN_ORDER: string[] = [
  'NOMBRE', 'NOMBRE_CAMISETA', 'NUMERO', 'TIENE_NUMERO', 'TALLA', 'ALTO', 'ANCHO',
  'MANGA_ALTO', 'MANGA_ANCHO', 'EQUIPO', 'NOTAS',
  // FRENTE — NOMBRE
  'LLEVA_NOMBRE_F', 'NOMBRE_F_ANCHO', 'NOMBRE_F_ALTO', 'NOMBRE_F_REF', 'NOMBRE_F_MARGIN_SUP',
  // FRENTE — NÚMERO
  'LLEVA_NUMERO_F', 'NUMERO_FRENTE_ANCHO', 'NUMERO_FRENTE_ALTO', 'NUMERO_FRENTE_REF', 'NUMERO_FRENTE_MARGIN_SUP',
  // FRENTE — ESCUDO
  'LLEVA_ESCUDO_F', 'ESCUDO_F_ANCHO', 'ESCUDO_F_ALTO', 'ESCUDO_F_REF', 'ESCUDO_F_MARGIN_SUP', 'ESCUDO_F_MARGIN_LAT',
  // FRENTE — ESCUDO CENTRAL
  'LLEVA_ESCUDO_CENTRAL', 'ESCUDO_CENTRAL_ANCHO', 'ESCUDO_CENTRAL_ALTO', 'ESCUDO_CENTRAL_REF', 'ESCUDO_CENTRAL_MARGIN_SUP',
  // FRENTE — LOGO MARCA
  'LLEVA_LOGO_MARCA', 'LOGO_MARCA_ANCHO', 'LOGO_MARCA_ALTO', 'LOGO_MARCA_REF', 'LOGO_MARCA_MARGIN_SUP', 'LOGO_MARCA_MARGIN_LAT',
  // FRENTE — SPONSORS TOP
  'LLEVA_SPONSOR_TOP_IZQ', 'SPONSOR_TOP_IZQ_ANCHO', 'SPONSOR_TOP_IZQ_ALTO', 'SPONSOR_TOP_IZQ_REF', 'SPONSOR_TOP_IZQ_MARGIN_SUP',
  'LLEVA_SPONSOR_TOP_DER', 'SPONSOR_TOP_DER_ANCHO', 'SPONSOR_TOP_DER_ALTO', 'SPONSOR_TOP_DER_REF', 'SPONSOR_TOP_DER_MARGIN_SUP',
  'LLEVA_SPONSOR_TOP_IZQ_SEC', 'SPONSOR_TOP_IZQ_SEC_ANCHO', 'SPONSOR_TOP_IZQ_SEC_ALTO', 'SPONSOR_TOP_IZQ_SEC_REF', 'SPONSOR_TOP_IZQ_SEC_MARGIN_SUP',
  'LLEVA_SPONSOR_TOP_DER_SEC', 'SPONSOR_TOP_DER_SEC_ANCHO', 'SPONSOR_TOP_DER_SEC_ALTO', 'SPONSOR_TOP_DER_SEC_REF', 'SPONSOR_TOP_DER_SEC_MARGIN_SUP',
  // FRENTE — SPONSOR PRINCIPAL / SECUNDARIO
  'LLEVA_SPONSOR_PRINCIPAL_F', 'SPONSOR_PRINCIPAL_F_ANCHO', 'SPONSOR_PRINCIPAL_F_ALTO', 'SPONSOR_PRINCIPAL_F_REF', 'SPONSOR_PRINCIPAL_F_MARGIN_SUP',
  'LLEVA_SPONSOR_SECUNDARIO_F', 'SPONSOR_SECUNDARIO_F_ANCHO', 'SPONSOR_SECUNDARIO_F_ALTO', 'SPONSOR_SECUNDARIO_F_REF', 'SPONSOR_SECUNDARIO_F_MARGIN_SUP',
  // FRENTE — COSTILLA
  'LLEVA_COSTILLA_F', 'COSTILLA_F_ANCHO', 'COSTILLA_F_ALTO', 'COSTILLA_F_REF',
  // FRENTE — ETIQUETA PRINCIPAL
  'LLEVA_ETIQUETA_PRINCIPAL_F', 'ETIQUETA_PRINCIPAL_F_ANCHO', 'ETIQUETA_PRINCIPAL_F_ALTO', 'ETIQUETA_PRINCIPAL_F_REF',
  'ETIQUETA_PRINCIPAL_F_MARGIN_INF', 'ETIQUETA_PRINCIPAL_F_MARGIN_LAT', 'ETIQUETA_PRINCIPAL_F_LADO',
  // FRENTE — ETIQUETA SECUNDARIA
  'LLEVA_ETIQUETA_SECUNDARIA_F', 'ETIQUETA_SECUNDARIA_F_ANCHO', 'ETIQUETA_SECUNDARIA_F_ALTO', 'ETIQUETA_SECUNDARIA_F_REF',
  'ETIQUETA_SECUNDARIA_F_MARGIN_INF', 'ETIQUETA_SECUNDARIA_F_MARGIN_LAT', 'ETIQUETA_SECUNDARIA_F_LADO',
  // ESPALDA — NOMBRE
  'LLEVA_NOMBRE_E', 'NOMBRE_E_ANCHO', 'NOMBRE_E_ALTO', 'NOMBRE_E_REF', 'NOMBRE_E_MARGIN_SUP',
  // ESPALDA — NÚMERO
  'LLEVA_NUMERO_E', 'NUMERO_ESPALDA_ANCHO', 'NUMERO_ESPALDA_ALTO', 'NUMERO_ESPALDA_REF', 'NUMERO_ESPALDA_MARGIN_SUP',
  // ESPALDA — ETIQUETA TOP
  'LLEVA_ETIQUETA_TOP', 'ETIQUETA_TOP_ANCHO', 'ETIQUETA_TOP_ALTO', 'ETIQUETA_TOP_REF',
  'ETIQUETA_TOP_MARGIN_SUP',
  // ESPALDA — ETIQUETA PRINCIPAL
  'LLEVA_ETIQUETA_PRINCIPAL_E', 'ETIQUETA_PRINCIPAL_E_ANCHO', 'ETIQUETA_PRINCIPAL_E_ALTO', 'ETIQUETA_PRINCIPAL_E_REF',
  'ETIQUETA_PRINCIPAL_E_MARGIN_INF', 'ETIQUETA_PRINCIPAL_E_MARGIN_LAT', 'ETIQUETA_PRINCIPAL_E_LADO',
  // ESPALDA — ETIQUETA SECUNDARIA
  'LLEVA_ETIQUETA_SECUNDARIA_E', 'ETIQUETA_SECUNDARIA_E_ANCHO', 'ETIQUETA_SECUNDARIA_E_ALTO', 'ETIQUETA_SECUNDARIA_E_REF',
  'ETIQUETA_SECUNDARIA_E_MARGIN_INF', 'ETIQUETA_SECUNDARIA_E_MARGIN_LAT', 'ETIQUETA_SECUNDARIA_E_LADO',
  // ESPALDA — SPONSOR PRINCIPAL / SECUNDARIO
  'LLEVA_SPONSOR_PRINCIPAL_E', 'SPONSOR_PRINCIPAL_E_ANCHO', 'SPONSOR_PRINCIPAL_E_ALTO', 'SPONSOR_PRINCIPAL_E_REF', 'SPONSOR_PRINCIPAL_E_MARGIN_SUP',
  'LLEVA_SPONSOR_SECUNDARIO_E', 'SPONSOR_SECUNDARIO_E_ANCHO', 'SPONSOR_SECUNDARIO_E_ALTO', 'SPONSOR_SECUNDARIO_E_REF', 'SPONSOR_SECUNDARIO_E_MARGIN_SUP',
  // ESPALDA — COSTILLA
  'LLEVA_COSTILLA_E', 'COSTILLA_E_ANCHO', 'COSTILLA_E_ALTO', 'COSTILLA_E_REF',
  // MANGA IZQ — NÚMERO
  'LLEVA_NUMERO_M_IZQ', 'NUMERO_M_IZQ_ANCHO', 'NUMERO_M_IZQ_ALTO', 'NUMERO_M_IZQ_REF', 'NUMERO_M_IZQ_MARGIN_INF',
  // MANGA IZQ — ESCUDO
  'LLEVA_ESCUDO_M_IZQ', 'ESCUDO_M_IZQ_ANCHO', 'ESCUDO_M_IZQ_ALTO', 'ESCUDO_M_IZQ_REF', 'ESCUDO_M_IZQ_MARGIN_INF',
  // MANGA IZQ — SPONSOR SECUNDARIO
  'LLEVA_SPONSOR_SECUNDARIO_M_IZQ', 'SPONSOR_SECUNDARIO_M_IZQ_ANCHO', 'SPONSOR_SECUNDARIO_M_IZQ_ALTO', 'SPONSOR_SECUNDARIO_M_IZQ_REF', 'SPONSOR_SECUNDARIO_M_IZQ_MARGIN_INF',
  // MANGA IZQ — LÍNEAS
  'LLEVA_MANGA_IZQ_LINEA_IZQ', 'MANGA_IZQ_LINEA_IZQ_ANCHO', 'MANGA_IZQ_LINEA_IZQ_ALTO', 'MANGA_IZQ_LINEA_IZQ_REF',
  'LLEVA_MANGA_IZQ_LINEA_DER', 'MANGA_IZQ_LINEA_DER_ANCHO', 'MANGA_IZQ_LINEA_DER_ALTO', 'MANGA_IZQ_LINEA_DER_REF',
  'LLEVA_MANGA_IZQ_LINEA_INF', 'MANGA_IZQ_LINEA_INF_ANCHO', 'MANGA_IZQ_LINEA_INF_ALTO', 'MANGA_IZQ_LINEA_INF_REF',
  // MANGA DER — NÚMERO
  'LLEVA_NUMERO_M_DER', 'NUMERO_M_DER_ANCHO', 'NUMERO_M_DER_ALTO', 'NUMERO_M_DER_REF', 'NUMERO_M_DER_MARGIN_INF',
  // MANGA DER — ESCUDO
  'LLEVA_ESCUDO_M_DER', 'ESCUDO_M_DER_ANCHO', 'ESCUDO_M_DER_ALTO', 'ESCUDO_M_DER_REF', 'ESCUDO_M_DER_MARGIN_INF',
  // MANGA DER — SPONSOR SECUNDARIO
  'LLEVA_SPONSOR_SECUNDARIO_M_DER', 'SPONSOR_SECUNDARIO_M_DER_ANCHO', 'SPONSOR_SECUNDARIO_M_DER_ALTO', 'SPONSOR_SECUNDARIO_M_DER_REF', 'SPONSOR_SECUNDARIO_M_DER_MARGIN_INF',
  // MANGA DER — LÍNEAS
  'LLEVA_MANGA_DER_LINEA_IZQ', 'MANGA_DER_LINEA_IZQ_ANCHO', 'MANGA_DER_LINEA_IZQ_ALTO', 'MANGA_DER_LINEA_IZQ_REF',
  'LLEVA_MANGA_DER_LINEA_DER', 'MANGA_DER_LINEA_DER_ANCHO', 'MANGA_DER_LINEA_DER_ALTO', 'MANGA_DER_LINEA_DER_REF',
  'LLEVA_MANGA_DER_LINEA_INF', 'MANGA_DER_LINEA_INF_ANCHO', 'MANGA_DER_LINEA_INF_ALTO', 'MANGA_DER_LINEA_INF_REF',
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
        fields: [numField('NOMBRE_F_ANCHO', 'Ancho'), numField('NOMBRE_F_ALTO', 'Alto'), refField('NOMBRE_F_REF'), numField('NOMBRE_F_MARGIN_SUP', 'Margen sup')] },
      { id: 'numero_f', label: 'NÚMERO', icon: '#', toggleKey: 'LLEVA_NUMERO_F',
        fields: [numField('NUMERO_FRENTE_ANCHO', 'Ancho'), numField('NUMERO_FRENTE_ALTO', 'Alto'), refField('NUMERO_FRENTE_REF'), numField('NUMERO_FRENTE_MARGIN_SUP', 'Margen sup')] },
      { id: 'escudo_f', label: 'ESCUDO', icon: '⬡', toggleKey: 'LLEVA_ESCUDO_F',
        fields: [numField('ESCUDO_F_ANCHO', 'Ancho'), numField('ESCUDO_F_ALTO', 'Alto'), refField('ESCUDO_F_REF'), numField('ESCUDO_F_MARGIN_SUP', 'Margen sup'), numField('ESCUDO_F_MARGIN_LAT', 'Margen lat')] },
      { id: 'escudo_central', label: 'ESCUDO CENTRAL', icon: '⬡', toggleKey: 'LLEVA_ESCUDO_CENTRAL',
        fields: [numField('ESCUDO_CENTRAL_ANCHO', 'Ancho'), numField('ESCUDO_CENTRAL_ALTO', 'Alto'), refField('ESCUDO_CENTRAL_REF'), numField('ESCUDO_CENTRAL_MARGIN_SUP', 'Margen sup')] },
      { id: 'logo_marca', label: 'LOGO MARCA', icon: '◈', toggleKey: 'LLEVA_LOGO_MARCA',
        fields: [numField('LOGO_MARCA_ANCHO', 'Ancho'), numField('LOGO_MARCA_ALTO', 'Alto'), refField('LOGO_MARCA_REF'), numField('LOGO_MARCA_MARGIN_SUP', 'Margen sup'), numField('LOGO_MARCA_MARGIN_LAT', 'Margen lat')] },
      { id: 'sponsor_top_izq', label: 'SPONSOR TOP IZQ', icon: '◧', toggleKey: 'LLEVA_SPONSOR_TOP_IZQ',
        fields: [numField('SPONSOR_TOP_IZQ_ANCHO', 'Ancho'), numField('SPONSOR_TOP_IZQ_ALTO', 'Alto'), refField('SPONSOR_TOP_IZQ_REF'), numField('SPONSOR_TOP_IZQ_MARGIN_SUP', 'Margen sup')] },
      { id: 'sponsor_top_der', label: 'SPONSOR TOP DER', icon: '◨', toggleKey: 'LLEVA_SPONSOR_TOP_DER',
        fields: [numField('SPONSOR_TOP_DER_ANCHO', 'Ancho'), numField('SPONSOR_TOP_DER_ALTO', 'Alto'), refField('SPONSOR_TOP_DER_REF'), numField('SPONSOR_TOP_DER_MARGIN_SUP', 'Margen sup')] },
      { id: 'sponsor_top_izq_sec', label: 'SPONSOR TOP IZQ SEC', icon: '◧', toggleKey: 'LLEVA_SPONSOR_TOP_IZQ_SEC',
        fields: [numField('SPONSOR_TOP_IZQ_SEC_ANCHO', 'Ancho'), numField('SPONSOR_TOP_IZQ_SEC_ALTO', 'Alto'), refField('SPONSOR_TOP_IZQ_SEC_REF'), numField('SPONSOR_TOP_IZQ_SEC_MARGIN_SUP', 'Margen sup')] },
      { id: 'sponsor_top_der_sec', label: 'SPONSOR TOP DER SEC', icon: '◨', toggleKey: 'LLEVA_SPONSOR_TOP_DER_SEC',
        fields: [numField('SPONSOR_TOP_DER_SEC_ANCHO', 'Ancho'), numField('SPONSOR_TOP_DER_SEC_ALTO', 'Alto'), refField('SPONSOR_TOP_DER_SEC_REF'), numField('SPONSOR_TOP_DER_SEC_MARGIN_SUP', 'Margen sup')] },
      { id: 'sponsor_principal_f', label: 'SPONSOR PRINCIPAL', icon: '★', toggleKey: 'LLEVA_SPONSOR_PRINCIPAL_F',
        fields: [numField('SPONSOR_PRINCIPAL_F_ANCHO', 'Ancho'), numField('SPONSOR_PRINCIPAL_F_ALTO', 'Alto'), refField('SPONSOR_PRINCIPAL_F_REF'), numField('SPONSOR_PRINCIPAL_F_MARGIN_SUP', 'Margen sup')] },
      { id: 'sponsor_secundario_f', label: 'SPONSOR SECUNDARIO', icon: '☆', toggleKey: 'LLEVA_SPONSOR_SECUNDARIO_F',
        fields: [numField('SPONSOR_SECUNDARIO_F_ANCHO', 'Ancho'), numField('SPONSOR_SECUNDARIO_F_ALTO', 'Alto'), refField('SPONSOR_SECUNDARIO_F_REF'), numField('SPONSOR_SECUNDARIO_F_MARGIN_SUP', 'Margen sup')] },
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
        fields: [numField('NOMBRE_E_ANCHO', 'Ancho'), numField('NOMBRE_E_ALTO', 'Alto'), refField('NOMBRE_E_REF'), numField('NOMBRE_E_MARGIN_SUP', 'Margen sup')] },
      { id: 'numero_e', label: 'NÚMERO', icon: '#', toggleKey: 'LLEVA_NUMERO_E',
        fields: [numField('NUMERO_ESPALDA_ANCHO', 'Ancho'), numField('NUMERO_ESPALDA_ALTO', 'Alto'), refField('NUMERO_ESPALDA_REF'), numField('NUMERO_ESPALDA_MARGIN_SUP', 'Margen sup')] },
      { id: 'etiqueta_top', label: 'ETIQUETA TOP', icon: '⬒', toggleKey: 'LLEVA_ETIQUETA_TOP',
        fields: [
          numField('ETIQUETA_TOP_ANCHO', 'Ancho'), numField('ETIQUETA_TOP_ALTO', 'Alto'), refField('ETIQUETA_TOP_REF'),
          numField('ETIQUETA_TOP_MARGIN_SUP', 'Margen sup'),
        ] },
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
        fields: [numField('SPONSOR_PRINCIPAL_E_ANCHO', 'Ancho'), numField('SPONSOR_PRINCIPAL_E_ALTO', 'Alto'), refField('SPONSOR_PRINCIPAL_E_REF'), numField('SPONSOR_PRINCIPAL_E_MARGIN_SUP', 'Margen sup')] },
      { id: 'sponsor_secundario_e', label: 'SPONSOR SECUNDARIO', icon: '☆', toggleKey: 'LLEVA_SPONSOR_SECUNDARIO_E',
        fields: [numField('SPONSOR_SECUNDARIO_E_ANCHO', 'Ancho'), numField('SPONSOR_SECUNDARIO_E_ALTO', 'Alto'), refField('SPONSOR_SECUNDARIO_E_REF'), numField('SPONSOR_SECUNDARIO_E_MARGIN_SUP', 'Margen sup')] },
      { id: 'costilla_e', label: 'COSTILLA', icon: '|||', toggleKey: 'LLEVA_COSTILLA_E',
        fields: [numField('COSTILLA_E_ANCHO', 'Ancho'), numField('COSTILLA_E_ALTO', 'Alto'), refField('COSTILLA_E_REF')] },
    ],
  },

  manga_izq: {
    label: 'MANGA IZQ',
    color: '#4A9BE8',
    elements: [
      { id: 'numero_m_izq', label: 'NÚMERO', icon: '#', toggleKey: 'LLEVA_NUMERO_M_IZQ',
        fields: [numField('NUMERO_M_IZQ_ANCHO', 'Ancho'), numField('NUMERO_M_IZQ_ALTO', 'Alto'), refField('NUMERO_M_IZQ_REF'), numField('NUMERO_M_IZQ_MARGIN_INF', 'Margen inf')] },
      { id: 'escudo_m_izq', label: 'ESCUDO', icon: '⬡', toggleKey: 'LLEVA_ESCUDO_M_IZQ',
        fields: [numField('ESCUDO_M_IZQ_ANCHO', 'Ancho'), numField('ESCUDO_M_IZQ_ALTO', 'Alto'), refField('ESCUDO_M_IZQ_REF'), numField('ESCUDO_M_IZQ_MARGIN_INF', 'Margen inf')] },
      { id: 'sponsor_secundario_m_izq', label: 'SPONSOR SECUNDARIO', icon: '☆', toggleKey: 'LLEVA_SPONSOR_SECUNDARIO_M_IZQ',
        fields: [numField('SPONSOR_SECUNDARIO_M_IZQ_ANCHO', 'Ancho'), numField('SPONSOR_SECUNDARIO_M_IZQ_ALTO', 'Alto'), refField('SPONSOR_SECUNDARIO_M_IZQ_REF'), numField('SPONSOR_SECUNDARIO_M_IZQ_MARGIN_INF', 'Margen inf')] },
      { id: 'linea_izq_izq', label: 'LÍNEA LATERAL IZQ', icon: '|', toggleKey: 'LLEVA_MANGA_IZQ_LINEA_IZQ',
        fields: [numField('MANGA_IZQ_LINEA_IZQ_ANCHO', 'Ancho'), numField('MANGA_IZQ_LINEA_IZQ_ALTO', 'Alto'), refField('MANGA_IZQ_LINEA_IZQ_REF')] },
      { id: 'linea_izq_der', label: 'LÍNEA LATERAL DER', icon: '|', toggleKey: 'LLEVA_MANGA_IZQ_LINEA_DER',
        fields: [numField('MANGA_IZQ_LINEA_DER_ANCHO', 'Ancho'), numField('MANGA_IZQ_LINEA_DER_ALTO', 'Alto'), refField('MANGA_IZQ_LINEA_DER_REF')] },
      { id: 'linea_izq_inf', label: 'LÍNEA INFERIOR', icon: '—', toggleKey: 'LLEVA_MANGA_IZQ_LINEA_INF',
        fields: [numField('MANGA_IZQ_LINEA_INF_ANCHO', 'Ancho'), numField('MANGA_IZQ_LINEA_INF_ALTO', 'Alto'), refField('MANGA_IZQ_LINEA_INF_REF')] },
    ],
  },

  manga_der: {
    label: 'MANGA DER',
    color: '#7B5CF0',
    elements: [
      { id: 'numero_m_der', label: 'NÚMERO', icon: '#', toggleKey: 'LLEVA_NUMERO_M_DER',
        fields: [numField('NUMERO_M_DER_ANCHO', 'Ancho'), numField('NUMERO_M_DER_ALTO', 'Alto'), refField('NUMERO_M_DER_REF'), numField('NUMERO_M_DER_MARGIN_INF', 'Margen inf')] },
      { id: 'escudo_m_der', label: 'ESCUDO', icon: '⬡', toggleKey: 'LLEVA_ESCUDO_M_DER',
        fields: [numField('ESCUDO_M_DER_ANCHO', 'Ancho'), numField('ESCUDO_M_DER_ALTO', 'Alto'), refField('ESCUDO_M_DER_REF'), numField('ESCUDO_M_DER_MARGIN_INF', 'Margen inf')] },
      { id: 'sponsor_secundario_m_der', label: 'SPONSOR SECUNDARIO', icon: '☆', toggleKey: 'LLEVA_SPONSOR_SECUNDARIO_M_DER',
        fields: [numField('SPONSOR_SECUNDARIO_M_DER_ANCHO', 'Ancho'), numField('SPONSOR_SECUNDARIO_M_DER_ALTO', 'Alto'), refField('SPONSOR_SECUNDARIO_M_DER_REF'), numField('SPONSOR_SECUNDARIO_M_DER_MARGIN_INF', 'Margen inf')] },
      { id: 'linea_der_izq', label: 'LÍNEA LATERAL IZQ', icon: '|', toggleKey: 'LLEVA_MANGA_DER_LINEA_IZQ',
        fields: [numField('MANGA_DER_LINEA_IZQ_ANCHO', 'Ancho'), numField('MANGA_DER_LINEA_IZQ_ALTO', 'Alto'), refField('MANGA_DER_LINEA_IZQ_REF')] },
      { id: 'linea_der_der', label: 'LÍNEA LATERAL DER', icon: '|', toggleKey: 'LLEVA_MANGA_DER_LINEA_DER',
        fields: [numField('MANGA_DER_LINEA_DER_ANCHO', 'Ancho'), numField('MANGA_DER_LINEA_DER_ALTO', 'Alto'), refField('MANGA_DER_LINEA_DER_REF')] },
      { id: 'linea_der_inf', label: 'LÍNEA INFERIOR', icon: '—', toggleKey: 'LLEVA_MANGA_DER_LINEA_INF',
        fields: [numField('MANGA_DER_LINEA_INF_ANCHO', 'Ancho'), numField('MANGA_DER_LINEA_INF_ALTO', 'Alto'), refField('MANGA_DER_LINEA_INF_REF')] },
    ],
  },
};

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

// ── Helpers de talla ─────────────────────────────────────────
export type Genero = 'H' | 'M' | 'other';

export function getGeneroTalla(talla: string): Genero {
  const last = talla.slice(-1).toUpperCase();
  if (last === 'H') return 'H';
  if (last === 'M') return 'M';
  return 'other';
}

export function getNumeroTalla(talla: string): number {
  return parseInt(talla, 10) || 0;
}

const GENERO_ORDER: Record<Genero, number> = { H: 0, M: 1, other: 2 };

export function sortTallas(tallas: string[]): string[] {
  return [...tallas].sort((a, b) => {
    const ga = getGeneroTalla(a);
    const gb = getGeneroTalla(b);
    if (ga !== gb) return GENERO_ORDER[ga] - GENERO_ORDER[gb];
    return getNumeroTalla(a) - getNumeroTalla(b);
  });
}

// Tallas estándar — siempre visibles en la pantalla de exportación
export const TALLAS_ESTANDAR = [
  '24H','26H','28H','30H','32H','34H','35H','36H','38H','40H','42H','44H',
  '24M','26M','28M','30M','32M','34M','35M','36M','38M','40M','42M','44M',
];
