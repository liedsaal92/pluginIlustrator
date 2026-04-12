// ============================================================
//  config.jsx
//  Configuración global y constantes de conversión
// ============================================================

var CONFIG = {
    // Dimensiones base de líneas de manga en el template .ai (en cm)
    // Si cambias el tamaño de estos grupos en el .ai, actualiza estos valores
    lineaMangaBase: {
        izq_ancho: 3.0057, // ancho de MANGA_LINEA_IZQ en el template
        der_ancho: 3.0057, // ancho de MANGA_LINEA_DER en el template
        inf_alto: 6.0     // alto de MANGA_LINEA_INF en el template
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
    hojaCSV: "DATOS_CSV",

    // Factor para estimar la altura visual (cap height) del NOMBRE cuando
    // createOutlines() no está disponible en este entorno de Illustrator.
    // Representa la fracción del em (tamaño de fuente) que ocupa la letra
    // mayúscula visible. Varía según la tipografía del template:
    //   - Fuentes bold display deportivas: ~0.70 – 0.75
    //   - Fuentes con mucho espacio de métricas: ~0.65
    // Si el font expone capHeight directamente (vía textFont.capHeight),
    // este valor se ignora y se usa el de la fuente automáticamente.
    capHeightFactor: 0.689
};

var CM_TO_PT = 28.3464567;
