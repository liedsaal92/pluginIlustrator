// ============================================================
//  schema.js — Definición de todos los campos configurables
//  Agrupados por pieza y elemento, para renderizar el formulario
// ============================================================

const REF_OPTIONS = ['PROPORCIONAL', 'ANCHO', 'ALTO'];
const LADO_OPTIONS = ['IZQ', 'DER'];

// Columnas fijas que vienen del Excel — NO son configurables por reglas
const PLAYER_KEYS = ['NOMBRE', 'NOMBRE_CAMISETA', 'NUMERO', 'TALLA', 'ALTO', 'ANCHO', 'MANGA_ALTO', 'MANGA_ANCHO'];

// Orden exacto de columnas del CSV final de salida
const CSV_COLUMN_ORDER = [
  'NOMBRE','NOMBRE_CAMISETA','NUMERO','TIENE_NUMERO','TALLA','ALTO','ANCHO',
  'MANGA_ALTO','MANGA_ANCHO','ESCUDO_ALTO','EQUIPO','LLEVA_NOMBRE_F','LLEVA_NOMBRE_E',
  'LLEVA_NUMERO_F','LLEVA_NUMERO_E','LLEVA_NUMERO_M','NOTAS','COSTILLA_ANCHO',
  'LLEVA_COSTILLA_F','LLEVA_COSTILLA_E','MANGA_LINEA_IZQ_ANCHO','MANGA_LINEA_DER_ANCHO',
  'MANGA_LINEA_INF_ALTO','ETIQUETA_MARGIN_INF','ETIQUETA_MARGIN_LAT','ETIQUETA_LADO',
  'LOGO_MARCA_ANCHO','LOGO_MARCA_ALTO','LOGO_MARCA_REF','ESCUDO_CENTRAL_ALTO',
  'NUMERO_FRENTE_ANCHO','NUMERO_FRENTE_ALTO','NUMERO_FRENTE_REF',
  'SPONSOR_TOP_IZQ_ANCHO','SPONSOR_TOP_DER_ANCHO','ETIQUETA_TOP_ALTO',
  'NUMERO_ESPALDA_ANCHO','NUMERO_ESPALDA_ALTO','NUMERO_ESPALDA_REF',
  'SPONSOR_PRINCIPAL_F_ANCHO','SPONSOR_PRINCIPAL_F_ALTO','SPONSOR_PRINCIPAL_F_REF',
  'SPONSOR_PRINCIPAL_E_ANCHO','SPONSOR_PRINCIPAL_E_ALTO','SPONSOR_PRINCIPAL_E_REF',
  'SPONSOR_SECUNDARIO_F_ANCHO','SPONSOR_SECUNDARIO_F_ALTO','SPONSOR_SECUNDARIO_F_REF',
  'SPONSOR_SECUNDARIO_E_ANCHO','SPONSOR_SECUNDARIO_E_ALTO','SPONSOR_SECUNDARIO_E_REF',
  'ESCUDO_M_ANCHO','ESCUDO_M_ALTO','ESCUDO_M_REF',
  'SPONSOR_SECUNDARIO_M_ANCHO','SPONSOR_SECUNDARIO_M_ALTO','SPONSOR_SECUNDARIO_M_REF',
  'MANGA_MARGIN_INF','MANGA_MARGIN_ESCUDO'
];

// Campos globales del diseño (mismo para todos los jugadores de un equipo)
const GLOBAL_FIELDS = [
  { key: 'EQUIPO', label: 'Equipo', type: 'text', placeholder: 'Atlas FC' },
  { key: 'NOTAS',  label: 'Notas',  type: 'text', placeholder: 'Observaciones...' },
];

// ── SCHEMA DE PIEZAS ─────────────────────────────────────────
const SCHEMA = {
  frente: {
    label: 'FRENTE',
    color: '#E8462A',
    elements: [
      {
        id: 'nombre_f', label: 'NOMBRE', icon: '✦',
        toggleKey: 'LLEVA_NOMBRE_F',
        fields: []
      },
      {
        id: 'numero_f', label: 'NÚMERO', icon: '#',
        toggleKey: 'LLEVA_NUMERO_F',
        fields: [
          { key: 'NUMERO_FRENTE_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'NUMERO_FRENTE_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'NUMERO_FRENTE_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'escudo_central', label: 'ESCUDO CENTRAL', icon: '⬡',
        toggleKey: null,
        fields: [
          { key: 'ESCUDO_CENTRAL_ALTO', label: 'Alto', type: 'number', unit: 'cm' },
        ]
      },
      {
        id: 'logo_marca', label: 'LOGO MARCA', icon: '◈',
        toggleKey: null,
        fields: [
          { key: 'LOGO_MARCA_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'LOGO_MARCA_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'LOGO_MARCA_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'sponsor_top_izq', label: 'SPONSOR TOP IZQ', icon: '◧',
        toggleKey: null,
        fields: [
          { key: 'SPONSOR_TOP_IZQ_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
        ]
      },
      {
        id: 'sponsor_top_der', label: 'SPONSOR TOP DER', icon: '◨',
        toggleKey: null,
        fields: [
          { key: 'SPONSOR_TOP_DER_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
        ]
      },
      {
        id: 'sponsor_principal_f', label: 'SPONSOR PRINCIPAL', icon: '★',
        toggleKey: null,
        fields: [
          { key: 'SPONSOR_PRINCIPAL_F_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'SPONSOR_PRINCIPAL_F_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'SPONSOR_PRINCIPAL_F_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'sponsor_secundario_f', label: 'SPONSOR SECUNDARIO', icon: '☆',
        toggleKey: null,
        fields: [
          { key: 'SPONSOR_SECUNDARIO_F_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'SPONSOR_SECUNDARIO_F_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'SPONSOR_SECUNDARIO_F_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'costilla_f', label: 'COSTILLA', icon: '|||',
        toggleKey: 'LLEVA_COSTILLA_F',
        fields: [
          { key: 'COSTILLA_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
        ]
      },
      {
        id: 'etiqueta_f', label: 'ETIQUETA', icon: '⬚',
        toggleKey: null,
        fields: [
          { key: 'ETIQUETA_MARGIN_INF', label: 'Margen inf', type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_MARGIN_LAT', label: 'Margen lat', type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_LADO',       label: 'Lado',       type: 'select', options: LADO_OPTIONS },
        ]
      },
    ]
  },

  espalda: {
    label: 'ESPALDA',
    color: '#F5C842',
    elements: [
      {
        id: 'nombre_e', label: 'NOMBRE', icon: '✦',
        toggleKey: 'LLEVA_NOMBRE_E',
        fields: []
      },
      {
        id: 'numero_e', label: 'NÚMERO', icon: '#',
        toggleKey: 'LLEVA_NUMERO_E',
        fields: [
          { key: 'NUMERO_ESPALDA_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'NUMERO_ESPALDA_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'NUMERO_ESPALDA_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'escudo_e', label: 'ESCUDO', icon: '⬡',
        toggleKey: null,
        fields: [
          { key: 'ESCUDO_ALTO', label: 'Alto', type: 'number', unit: 'cm' },
        ]
      },
      {
        id: 'etiqueta_top', label: 'ETIQUETA TOP', icon: '⬒',
        toggleKey: null,
        fields: [
          { key: 'ETIQUETA_TOP_ALTO', label: 'Alto', type: 'number', unit: 'cm' },
        ]
      },
      {
        id: 'sponsor_principal_e', label: 'SPONSOR PRINCIPAL', icon: '★',
        toggleKey: null,
        fields: [
          { key: 'SPONSOR_PRINCIPAL_E_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'SPONSOR_PRINCIPAL_E_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'SPONSOR_PRINCIPAL_E_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'sponsor_secundario_e', label: 'SPONSOR SECUNDARIO', icon: '☆',
        toggleKey: null,
        fields: [
          { key: 'SPONSOR_SECUNDARIO_E_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'SPONSOR_SECUNDARIO_E_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'SPONSOR_SECUNDARIO_E_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'costilla_e', label: 'COSTILLA', icon: '|||',
        toggleKey: 'LLEVA_COSTILLA_E',
        fields: [
          { key: 'COSTILLA_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
        ]
      },
    ]
  },

  manga_izq: {
    label: 'MANGA IZQ',
    color: '#4A9BE8',
    elements: [
      {
        id: 'numero_m', label: 'NÚMERO', icon: '#',
        toggleKey: 'LLEVA_NUMERO_M',
        fields: []
      },
      {
        id: 'escudo_m', label: 'ESCUDO', icon: '⬡',
        toggleKey: null,
        fields: [
          { key: 'ESCUDO_M_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'ESCUDO_M_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'ESCUDO_M_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'sponsor_secundario_m', label: 'SPONSOR SECUNDARIO', icon: '☆',
        toggleKey: null,
        fields: [
          { key: 'SPONSOR_SECUNDARIO_M_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'SPONSOR_SECUNDARIO_M_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'SPONSOR_SECUNDARIO_M_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'linea_izq', label: 'LÍNEA LATERAL IZQ', icon: '|',
        toggleKey: null,
        fields: [
          { key: 'MANGA_LINEA_IZQ_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
        ]
      },
      {
        id: 'linea_der', label: 'LÍNEA LATERAL DER', icon: '|',
        toggleKey: null,
        fields: [
          { key: 'MANGA_LINEA_DER_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
        ]
      },
      {
        id: 'linea_inf', label: 'LÍNEA INFERIOR', icon: '—',
        toggleKey: null,
        fields: [
          { key: 'MANGA_LINEA_INF_ALTO', label: 'Alto', type: 'number', unit: 'cm' },
        ]
      },
      {
        id: 'manga_posicion', label: 'POSICIONAMIENTO', icon: '⊹',
        toggleKey: null,
        fields: [
          { key: 'MANGA_MARGIN_INF',    label: 'Margen inf',    type: 'number', unit: 'cm' },
          { key: 'MANGA_MARGIN_ESCUDO', label: 'Margen escudo', type: 'number', unit: 'cm' },
        ]
      },
    ]
  },

  manga_der: {
    label: 'MANGA DER',
    color: '#7B5CF0',
    elements: [] // se asigna abajo — comparte elementos con manga_izq
  }
};

// MANGA_DER comparte los mismos elementos que MANGA_IZQ
SCHEMA.manga_der.elements = SCHEMA.manga_izq.elements;

// Retorna los defaults vacíos para una pieza
function getDefaultRules(pieza) {
  const out = {};
  if (!SCHEMA[pieza]) return out;
  SCHEMA[pieza].elements.forEach(el => {
    if (el.toggleKey) out[el.toggleKey] = 'NO';
    el.fields.forEach(f => { out[f.key] = ''; });
  });
  return out;
}

function getDefaultGlobal() {
  const out = {};
  GLOBAL_FIELDS.forEach(f => { out[f.key] = ''; });
  return out;
}
