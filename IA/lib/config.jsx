// ============================================================
//  config.jsx
//  Configuración global y constantes de conversión
// ============================================================

var CONFIG = {
    // Dimensiones base de la plantilla .ai (en cm)
    // Si cambias el tamaño del template, actualiza estos valores
    templateBase: {
        frente:    { ancho: 55,   alto: 79.5  }, // medido en plantilla .ai
        espalda:   { ancho: 55,   alto: 79.5  }, // medido en plantilla .ai
        manga_izq: { ancho: 46,   alto: 28.5  }, // medido en plantilla .ai
        manga_der: { ancho: 46,   alto: 28.5  }  // simetrica a manga_izq
    },

    // Dimensiones base de líneas de manga en el template .ai (en cm)
    // Si cambias el tamaño de estos grupos en el .ai, actualiza estos valores
    lineaMangaBase: {
        izq_ancho: 3.0057, // ancho de MANGA_LINEA_IZQ en el template
        der_ancho: 3.0057, // ancho de MANGA_LINEA_DER en el template
        inf_alto:  6.0     // alto de MANGA_LINEA_INF en el template
    },

    // Ancho máximo del plóter en cm
    ploterAncho: 130,

    // Separación entre piezas (en puntos)
    gapX: 20,
    gapY: 20,
    gapSeccion: 50, // separación entre secciones de piezas

    // Nombres exactos de grupos en la plantilla
    piezas: ["FRENTE", "ESPALDA", "MANGA_IZQ", "MANGA_DER"],

    // Nombres de items dinámicos dentro de DINAMICO
    itemNombre: "NOMBRE",
    itemNumero: "NUMERO",
    itemEscudo: "ESCUDO",

    // Hoja del xlsx que contiene los jugadores
    hojaCSV: "DATOS_CSV"
};

var CM_TO_PT = 28.3464567;
