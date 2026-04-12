// ============================================================
//  escala.jsx
//  Escalado de grupos y cálculo de dimensiones
// ============================================================

// Escala un grupo al tamaño exacto indicado (en cm).
// Usa el factor mayor para garantizar que ambas dimensiones queden >= al CSV.
// Devuelve el factor real aplicado { x, y } (ambos iguales, escala uniforme).
function scaleGroupExact(grupo, targetAnchoCmd, targetAltoCmd, base) {
    var scaleX = targetAnchoCmd / base.ancho;
    var scaleY = targetAltoCmd  / base.alto;
    // Math.max garantiza que ambas dimensiones queden >= al valor del CSV
    var factor = Math.max(scaleX, scaleY);
    var pct    = factor * 100;

    grupo.left = 0;
    grupo.top  = 0;

    grupo.resize(
        pct, pct,
        true, true, true, true, pct,
        Transformation.TOPLEFT
    );

    grupo.left = 0;
    grupo.top  = 0;

    // Retorna los factores reales aplicados a cada dimensión
    // Ambos son iguales (escala uniforme) pero los devolvemos separados
    // para que las funciones de líneas puedan compensar correctamente
    return { x: factor, y: factor };
}

// Escala el logo desde su centro según LOGO_ANCHO del CSV (define el alto final)
function escalarLogoDesdecentro(grupoLogo, targetAltoCmd) {
    // Escala por ALTO — el ancho sigue proporcional
    // LOGO_ANCHO en el CSV define el alto exacto final del logo
    var bounds       = grupoLogo.geometricBounds;
    var altoPt       = Math.abs(bounds[1] - bounds[3]);
    if (altoPt <= 0) return;

    var altoActualCm = ptToCm(altoPt);
    var factor       = (targetAltoCmd / altoActualCm) * 100;

    // Escalar desde el centro — la posición del logo se mantiene
    grupoLogo.resize(
        factor, factor,
        true,   // changePositions
        true,   // changeFillPatterns
        true,   // changeFillGradients
        true,   // changeStrokePattern
        factor, // changeLineWidths
        Transformation.CENTER
    );
}

// Escala cualquier item desde su centro usando ANCHO o ALTO como referencia.
// ref = "ANCHO" → el ancho queda en targetCm, alto sigue proporcional
// ref = "ALTO"  → el alto queda en targetCm, ancho sigue proporcional
function escalarItemDesdecentro(item, targetCm, ref) {
    var bounds   = item.geometricBounds;
    var anchoPt  = Math.abs(bounds[2] - bounds[0]);
    var altoPt   = Math.abs(bounds[1] - bounds[3]);

    var actualCm = (ref === "ANCHO") ? ptToCm(anchoPt) : ptToCm(altoPt);
    if (actualCm <= 0) return;

    var factor = (targetCm / actualCm) * 100;

    item.resize(
        factor, factor,
        true, true, true, true, factor,
        Transformation.CENTER
    );
}

// Escala un item desde su centro en proporción al factor de la pieza (escala proporcional).
// El item crece/decrece igual que la pieza completa.
function escalarItemProporcional(item, factorPieza) {
    var pct = factorPieza * 100;
    item.resize(
        pct, pct,
        true, true, true, true, pct,
        Transformation.CENTER
    );
}

// Devuelve { ancho, alto } en cm para la pieza y jugador dados, o null si faltan datos
function getDimensiones(jugador, nombrePieza) {
    if (nombrePieza === "FRENTE" || nombrePieza === "ESPALDA") {
        var a = parseFloat(jugador.ANCHO);
        var h = parseFloat(jugador.ALTO);
        if (isNaN(a) || a <= 0 || isNaN(h) || h <= 0) return null;
        return { ancho: a, alto: h };
    }
    if (nombrePieza === "MANGA_IZQ" || nombrePieza === "MANGA_DER") {
        var ma = parseFloat(jugador.MANGA_ANCHO);
        var mh = parseFloat(jugador.MANGA_ALTO);
        if (isNaN(ma) || ma <= 0 || isNaN(mh) || mh <= 0) return null;
        return { ancho: ma, alto: mh };
    }
    return null;
}

