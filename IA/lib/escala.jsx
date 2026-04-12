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

// Devuelve los bounds visuales reales [L,T,R,B] en puntos de un item que
// contiene texto. Tres intentos en orden:
//   A) createOutlines() sobre TextFrame movido al nivel de capa
//   B) executeMenuCommand("outline") — comprueba selection Y pageItems[0]
//   C) Estimación: fontSize × CAP_HEIGHT_FACTOR (fallback sin outlines)
// Retorna null si el item no contiene texto o si todo intento falla.
var CAP_HEIGHT_FACTOR = 0.72; // cap height típica de fuentes bold display (fracción del em)

function getTextVisualBounds(item) {
    var tf = null;
    if (item.typename === "TextFrame") {
        tf = item;
    } else {
        try { tf = findTextFrameRecursivo(item); } catch (e) {}
    }
    if (!tf) {
        Log.info("getTextVisualBounds: no TextFrame en item tipo=" + item.typename);
        return null;
    }

    var doc = app.activeDocument;
    var layer;
    try   { layer = doc.layers.getByName("GENERADO"); }
    catch (e) { layer = doc.activeLayer; }

    // — Mover duplicado al nivel de capa —
    try {
        var dup = tf.duplicate();
        dup.move(layer, ElementPlacement.PLACEATBEGINNING);
        // 'dup' invalido tras move() en AI 2024
    } catch (eMove) {
        Log.error("getTextVisualBounds: move fallo: " + eMove.message);
        return getTextVisualBoundsFromFont(tf);
    }

    if (layer.textFrames.length === 0) {
        Log.error("getTextVisualBounds: no hay TextFrames en capa tras move");
        return getTextVisualBoundsFromFont(tf);
    }

    var movedTF = layer.textFrames[0];
    layer.locked   = false;
    movedTF.locked = false;
    movedTF.hidden = false;

    // — Intento A: createOutlines() —
    var outlines = null;
    try {
        outlines = movedTF.createOutlines();
        movedTF  = null;
        var bA = outlines.geometricBounds;
        outlines.remove();
        Log.info("getTextVisualBounds OK (A): h=" + ptToCm(Math.abs(bA[1]-bA[3])).toFixed(2) + "cm");
        return bA;
    } catch (eA) {
        Log.error("getTextVisualBounds A (createOutlines) fallo: " + eA.message);
        try { if (outlines) outlines.remove(); } catch (e2) {}
        outlines = null;
    }

    // — Intento B: executeMenuCommand("outline") —
    // La selección puede quedar vacía aunque el item se convierta;
    // verificar también layer.pageItems[0] por si el resultado quedó sin seleccionar.
    try {
        doc.activeLayer = layer;
        app.selection   = [movedTF];
        app.executeMenuCommand("outline");

        var outItem = null;
        var sel     = doc.selection;
        if (sel && sel.length > 0) {
            outItem = sel[0];
        } else {
            // Verificar si el TextFrame fue reemplazado por outlines sin selección
            var top = layer.pageItems[0];
            if (top && top.typename !== "TextFrame") {
                outItem = top;
                Log.info("getTextVisualBounds B: resultado en pageItems[0] typename=" + top.typename);
            }
        }

        if (outItem) {
            var bB = outItem.geometricBounds;
            outItem.remove();
            app.selection = null;
            movedTF = null;
            Log.info("getTextVisualBounds OK (B): h=" + ptToCm(Math.abs(bB[1]-bB[3])).toFixed(2) + "cm");
            return bB;
        }
        Log.error("getTextVisualBounds B: sin item convertido");
    } catch (eB) {
        Log.error("getTextVisualBounds B (executeMenuCommand) fallo: " + eB.message);
    }
    try { app.selection = null; } catch (e2) {}
    try { if (movedTF) movedTF.remove(); } catch (e2) {}

    // — Intento C: estimación por fontSize —
    return getTextVisualBoundsFromFont(tf);
}

// Fallback: estima la altura visual de un TextFrame a partir de fontSize × CAP_HEIGHT_FACTOR.
// Válido para texto en MAYÚSCULAS con fuentes bold display (jerseys).
// El ancho se toma de geometricBounds (es preciso horizontalmente).
function getTextVisualBoundsFromFont(tf) {
    try {
        var fsSizePt = tf.textRange.characterAttributes.size;
        Log.info("getTextVisualBoundsFromFont: fontSize=" +
                 ptToCm(fsSizePt).toFixed(3) + "cm factor=" + CAP_HEIGHT_FACTOR);
        if (!fsSizePt || fsSizePt <= 0) return null;
        var gb        = tf.geometricBounds;           // [L, T, R, B]
        var visAltoPt = fsSizePt * CAP_HEIGHT_FACTOR; // altura visual estimada
        // Construir bounds con el ancho real y la altura visual estimada
        var fakeBounds = [gb[0], gb[1], gb[2], gb[1] - visAltoPt];
        Log.info("getTextVisualBoundsFromFont OK: h=" +
                 ptToCm(visAltoPt).toFixed(2) + "cm");
        return fakeBounds;
    } catch (eFont) {
        Log.error("getTextVisualBoundsFromFont fallo: " + eFont.message);
        return null;
    }
}

// Escala cualquier item desde su centro usando ANCHO o ALTO como referencia.
// ref = "ANCHO" → el ancho queda en targetCm, alto sigue proporcional
// ref = "ALTO"  → el alto queda en targetCm, ancho sigue proporcional
// Para items con texto usa bounds visuales (outlines) para evitar el
// espacio vacío de métricas tipográficas en el bounding box.
function escalarItemDesdecentro(item, targetCm, ref) {
    var bounds  = item.geometricBounds;
    var anchoPt = Math.abs(bounds[2] - bounds[0]);
    var altoPt  = Math.abs(bounds[1] - bounds[3]);

    // Si el item contiene texto, reemplazar con los bounds visuales reales
    var vb = getTextVisualBounds(item);
    if (vb) {
        var anchoPtV = Math.abs(vb[2] - vb[0]);
        var altoPtV  = Math.abs(vb[1] - vb[3]);
        Log.info("escalarItemDesdecentro: geom=[" +
                 ptToCm(anchoPt).toFixed(2) + "cm x " + ptToCm(altoPt).toFixed(2) + "cm]" +
                 " visual=[" + ptToCm(anchoPtV).toFixed(2) + "cm x " + ptToCm(altoPtV).toFixed(2) + "cm]" +
                 " target" + ref + "=" + targetCm + "cm");
        anchoPt = anchoPtV;
        altoPt  = altoPtV;
    } else {
        Log.info("escalarItemDesdecentro: usando geom (sin visual bounds)" +
                 " [" + ptToCm(anchoPt).toFixed(2) + "cm x " + ptToCm(altoPt).toFixed(2) + "cm]" +
                 " target" + ref + "=" + targetCm + "cm");
    }

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

