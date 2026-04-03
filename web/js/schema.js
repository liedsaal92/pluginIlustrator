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
  'MANGA_ALTO','MANGA_ANCHO','EQUIPO','NOTAS',
  // FRENTE — NOMBRE
  'LLEVA_NOMBRE_F','NOMBRE_F_ANCHO','NOMBRE_F_ALTO','NOMBRE_F_REF',
  // FRENTE — NÚMERO
  'LLEVA_NUMERO_F','NUMERO_FRENTE_ANCHO','NUMERO_FRENTE_ALTO','NUMERO_FRENTE_REF',
  // FRENTE — ESCUDO CENTRAL
  'LLEVA_ESCUDO_CENTRAL','ESCUDO_CENTRAL_ANCHO','ESCUDO_CENTRAL_ALTO','ESCUDO_CENTRAL_REF',
  // FRENTE — LOGO MARCA
  'LLEVA_LOGO_MARCA','LOGO_MARCA_ANCHO','LOGO_MARCA_ALTO','LOGO_MARCA_REF',
  // FRENTE — SPONSORS TOP
  'LLEVA_SPONSOR_TOP_IZQ','SPONSOR_TOP_IZQ_ANCHO','SPONSOR_TOP_IZQ_ALTO','SPONSOR_TOP_IZQ_REF',
  'LLEVA_SPONSOR_TOP_DER','SPONSOR_TOP_DER_ANCHO','SPONSOR_TOP_DER_ALTO','SPONSOR_TOP_DER_REF',
  // FRENTE — SPONSOR PRINCIPAL / SECUNDARIO
  'LLEVA_SPONSOR_PRINCIPAL_F','SPONSOR_PRINCIPAL_F_ANCHO','SPONSOR_PRINCIPAL_F_ALTO','SPONSOR_PRINCIPAL_F_REF',
  'LLEVA_SPONSOR_SECUNDARIO_F','SPONSOR_SECUNDARIO_F_ANCHO','SPONSOR_SECUNDARIO_F_ALTO','SPONSOR_SECUNDARIO_F_REF',
  // FRENTE — COSTILLA
  'LLEVA_COSTILLA_F','COSTILLA_F_ANCHO','COSTILLA_F_ALTO','COSTILLA_F_REF',
  // FRENTE — ETIQUETA PRINCIPAL
  'LLEVA_ETIQUETA_PRINCIPAL_F','ETIQUETA_PRINCIPAL_F_ANCHO','ETIQUETA_PRINCIPAL_F_ALTO','ETIQUETA_PRINCIPAL_F_REF',
  'ETIQUETA_PRINCIPAL_F_MARGIN_INF','ETIQUETA_PRINCIPAL_F_MARGIN_LAT','ETIQUETA_PRINCIPAL_F_LADO',
  // FRENTE — ETIQUETA SECUNDARIA
  'LLEVA_ETIQUETA_SECUNDARIA_F','ETIQUETA_SECUNDARIA_F_ANCHO','ETIQUETA_SECUNDARIA_F_ALTO','ETIQUETA_SECUNDARIA_F_REF',
  'ETIQUETA_SECUNDARIA_F_MARGIN_INF','ETIQUETA_SECUNDARIA_F_MARGIN_LAT','ETIQUETA_SECUNDARIA_F_LADO',
  // ESPALDA — NOMBRE
  'LLEVA_NOMBRE_E','NOMBRE_E_ANCHO','NOMBRE_E_ALTO','NOMBRE_E_REF',
  // ESPALDA — NÚMERO
  'LLEVA_NUMERO_E','NUMERO_ESPALDA_ANCHO','NUMERO_ESPALDA_ALTO','NUMERO_ESPALDA_REF',
  // ESPALDA — ESCUDO
  'LLEVA_ESCUDO_E','ESCUDO_E_ANCHO','ESCUDO_E_ALTO','ESCUDO_E_REF',
  // ESPALDA — ETIQUETA TOP
  'LLEVA_ETIQUETA_TOP','ETIQUETA_TOP_ANCHO','ETIQUETA_TOP_ALTO','ETIQUETA_TOP_REF',
  // ESPALDA — ETIQUETA PRINCIPAL
  'LLEVA_ETIQUETA_PRINCIPAL_E','ETIQUETA_PRINCIPAL_E_ANCHO','ETIQUETA_PRINCIPAL_E_ALTO','ETIQUETA_PRINCIPAL_E_REF',
  'ETIQUETA_PRINCIPAL_E_MARGIN_INF','ETIQUETA_PRINCIPAL_E_MARGIN_LAT','ETIQUETA_PRINCIPAL_E_LADO',
  // ESPALDA — ETIQUETA SECUNDARIA
  'LLEVA_ETIQUETA_SECUNDARIA_E','ETIQUETA_SECUNDARIA_E_ANCHO','ETIQUETA_SECUNDARIA_E_ALTO','ETIQUETA_SECUNDARIA_E_REF',
  'ETIQUETA_SECUNDARIA_E_MARGIN_INF','ETIQUETA_SECUNDARIA_E_MARGIN_LAT','ETIQUETA_SECUNDARIA_E_LADO',
  // ESPALDA — SPONSOR PRINCIPAL / SECUNDARIO
  'LLEVA_SPONSOR_PRINCIPAL_E','SPONSOR_PRINCIPAL_E_ANCHO','SPONSOR_PRINCIPAL_E_ALTO','SPONSOR_PRINCIPAL_E_REF',
  'LLEVA_SPONSOR_SECUNDARIO_E','SPONSOR_SECUNDARIO_E_ANCHO','SPONSOR_SECUNDARIO_E_ALTO','SPONSOR_SECUNDARIO_E_REF',
  // ESPALDA — COSTILLA
  'LLEVA_COSTILLA_E','COSTILLA_E_ANCHO','COSTILLA_E_ALTO','COSTILLA_E_REF',
  // MANGA — NÚMERO
  'LLEVA_NUMERO_M','NUMERO_M_ANCHO','NUMERO_M_ALTO','NUMERO_M_REF',
  // MANGA — ESCUDO / SPONSOR
  'LLEVA_ESCUDO_M','ESCUDO_M_ANCHO','ESCUDO_M_ALTO','ESCUDO_M_REF',
  'LLEVA_SPONSOR_SECUNDARIO_M','SPONSOR_SECUNDARIO_M_ANCHO','SPONSOR_SECUNDARIO_M_ALTO','SPONSOR_SECUNDARIO_M_REF',
  // MANGA — LÍNEAS
  'LLEVA_MANGA_LINEA_IZQ','MANGA_LINEA_IZQ_ANCHO','MANGA_LINEA_IZQ_ALTO','MANGA_LINEA_IZQ_REF',
  'LLEVA_MANGA_LINEA_DER','MANGA_LINEA_DER_ANCHO','MANGA_LINEA_DER_ALTO','MANGA_LINEA_DER_REF',
  'LLEVA_MANGA_LINEA_INF','MANGA_LINEA_INF_ANCHO','MANGA_LINEA_INF_ALTO','MANGA_LINEA_INF_REF',
  // MANGA — POSICIONAMIENTO
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
        fields: [
          { key: 'NOMBRE_F_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'NOMBRE_F_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'NOMBRE_F_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
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
        toggleKey: 'LLEVA_ESCUDO_CENTRAL',
        fields: [
          { key: 'ESCUDO_CENTRAL_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'ESCUDO_CENTRAL_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'ESCUDO_CENTRAL_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'logo_marca', label: 'LOGO MARCA', icon: '◈',
        toggleKey: 'LLEVA_LOGO_MARCA',
        fields: [
          { key: 'LOGO_MARCA_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'LOGO_MARCA_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'LOGO_MARCA_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'sponsor_top_izq', label: 'SPONSOR TOP IZQ', icon: '◧',
        toggleKey: 'LLEVA_SPONSOR_TOP_IZQ',
        fields: [
          { key: 'SPONSOR_TOP_IZQ_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'SPONSOR_TOP_IZQ_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'SPONSOR_TOP_IZQ_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'sponsor_top_der', label: 'SPONSOR TOP DER', icon: '◨',
        toggleKey: 'LLEVA_SPONSOR_TOP_DER',
        fields: [
          { key: 'SPONSOR_TOP_DER_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'SPONSOR_TOP_DER_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'SPONSOR_TOP_DER_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'sponsor_principal_f', label: 'SPONSOR PRINCIPAL', icon: '★',
        toggleKey: 'LLEVA_SPONSOR_PRINCIPAL_F',
        fields: [
          { key: 'SPONSOR_PRINCIPAL_F_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'SPONSOR_PRINCIPAL_F_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'SPONSOR_PRINCIPAL_F_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'sponsor_secundario_f', label: 'SPONSOR SECUNDARIO', icon: '☆',
        toggleKey: 'LLEVA_SPONSOR_SECUNDARIO_F',
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
          { key: 'COSTILLA_F_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'COSTILLA_F_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'COSTILLA_F_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'etiqueta_principal_f', label: 'ETIQUETA PRINCIPAL', icon: '⬚',
        toggleKey: 'LLEVA_ETIQUETA_PRINCIPAL_F',
        fields: [
          { key: 'ETIQUETA_PRINCIPAL_F_ANCHO',      label: 'Ancho',      type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_PRINCIPAL_F_ALTO',       label: 'Alto',       type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_PRINCIPAL_F_REF',        label: 'Ref',        type: 'select', options: REF_OPTIONS },
          { key: 'ETIQUETA_PRINCIPAL_F_MARGIN_INF', label: 'Margen inf', type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_PRINCIPAL_F_MARGIN_LAT', label: 'Margen lat', type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_PRINCIPAL_F_LADO',       label: 'Lado',       type: 'select', options: LADO_OPTIONS },
        ]
      },
      {
        id: 'etiqueta_secundaria_f', label: 'ETIQUETA SECUNDARIA', icon: '⬙',
        toggleKey: 'LLEVA_ETIQUETA_SECUNDARIA_F',
        fields: [
          { key: 'ETIQUETA_SECUNDARIA_F_ANCHO',      label: 'Ancho',      type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_SECUNDARIA_F_ALTO',       label: 'Alto',       type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_SECUNDARIA_F_REF',        label: 'Ref',        type: 'select', options: REF_OPTIONS },
          { key: 'ETIQUETA_SECUNDARIA_F_MARGIN_INF', label: 'Margen inf', type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_SECUNDARIA_F_MARGIN_LAT', label: 'Margen lat', type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_SECUNDARIA_F_LADO',       label: 'Lado',       type: 'select', options: LADO_OPTIONS },
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
        fields: [
          { key: 'NOMBRE_E_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'NOMBRE_E_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'NOMBRE_E_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
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
        toggleKey: 'LLEVA_ESCUDO_E',
        fields: [
          { key: 'ESCUDO_E_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'ESCUDO_E_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'ESCUDO_E_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'etiqueta_top', label: 'ETIQUETA TOP', icon: '⬒',
        toggleKey: 'LLEVA_ETIQUETA_TOP',
        fields: [
          { key: 'ETIQUETA_TOP_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_TOP_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_TOP_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'etiqueta_principal_e', label: 'ETIQUETA PRINCIPAL', icon: '⬚',
        toggleKey: 'LLEVA_ETIQUETA_PRINCIPAL_E',
        fields: [
          { key: 'ETIQUETA_PRINCIPAL_E_ANCHO',      label: 'Ancho',      type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_PRINCIPAL_E_ALTO',       label: 'Alto',       type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_PRINCIPAL_E_REF',        label: 'Ref',        type: 'select', options: REF_OPTIONS },
          { key: 'ETIQUETA_PRINCIPAL_E_MARGIN_INF', label: 'Margen inf', type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_PRINCIPAL_E_MARGIN_LAT', label: 'Margen lat', type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_PRINCIPAL_E_LADO',       label: 'Lado',       type: 'select', options: LADO_OPTIONS },
        ]
      },
      {
        id: 'etiqueta_secundaria_e', label: 'ETIQUETA SECUNDARIA', icon: '⬙',
        toggleKey: 'LLEVA_ETIQUETA_SECUNDARIA_E',
        fields: [
          { key: 'ETIQUETA_SECUNDARIA_E_ANCHO',      label: 'Ancho',      type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_SECUNDARIA_E_ALTO',       label: 'Alto',       type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_SECUNDARIA_E_REF',        label: 'Ref',        type: 'select', options: REF_OPTIONS },
          { key: 'ETIQUETA_SECUNDARIA_E_MARGIN_INF', label: 'Margen inf', type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_SECUNDARIA_E_MARGIN_LAT', label: 'Margen lat', type: 'number', unit: 'cm' },
          { key: 'ETIQUETA_SECUNDARIA_E_LADO',       label: 'Lado',       type: 'select', options: LADO_OPTIONS },
        ]
      },
      {
        id: 'sponsor_principal_e', label: 'SPONSOR PRINCIPAL', icon: '★',
        toggleKey: 'LLEVA_SPONSOR_PRINCIPAL_E',
        fields: [
          { key: 'SPONSOR_PRINCIPAL_E_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'SPONSOR_PRINCIPAL_E_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'SPONSOR_PRINCIPAL_E_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'sponsor_secundario_e', label: 'SPONSOR SECUNDARIO', icon: '☆',
        toggleKey: 'LLEVA_SPONSOR_SECUNDARIO_E',
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
          { key: 'COSTILLA_E_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'COSTILLA_E_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'COSTILLA_E_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
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
        fields: [
          { key: 'NUMERO_M_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'NUMERO_M_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'NUMERO_M_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'escudo_m', label: 'ESCUDO', icon: '⬡',
        toggleKey: 'LLEVA_ESCUDO_M',
        fields: [
          { key: 'ESCUDO_M_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'ESCUDO_M_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'ESCUDO_M_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'sponsor_secundario_m', label: 'SPONSOR SECUNDARIO', icon: '☆',
        toggleKey: 'LLEVA_SPONSOR_SECUNDARIO_M',
        fields: [
          { key: 'SPONSOR_SECUNDARIO_M_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'SPONSOR_SECUNDARIO_M_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'SPONSOR_SECUNDARIO_M_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'linea_izq', label: 'LÍNEA LATERAL IZQ', icon: '|',
        toggleKey: 'LLEVA_MANGA_LINEA_IZQ',
        fields: [
          { key: 'MANGA_LINEA_IZQ_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'MANGA_LINEA_IZQ_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'MANGA_LINEA_IZQ_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'linea_der', label: 'LÍNEA LATERAL DER', icon: '|',
        toggleKey: 'LLEVA_MANGA_LINEA_DER',
        fields: [
          { key: 'MANGA_LINEA_DER_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'MANGA_LINEA_DER_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'MANGA_LINEA_DER_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
        ]
      },
      {
        id: 'linea_inf', label: 'LÍNEA INFERIOR', icon: '—',
        toggleKey: 'LLEVA_MANGA_LINEA_INF',
        fields: [
          { key: 'MANGA_LINEA_INF_ANCHO', label: 'Ancho', type: 'number', unit: 'cm' },
          { key: 'MANGA_LINEA_INF_ALTO',  label: 'Alto',  type: 'number', unit: 'cm' },
          { key: 'MANGA_LINEA_INF_REF',   label: 'Ref',   type: 'select', options: REF_OPTIONS },
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
