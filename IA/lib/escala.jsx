// ============================================================
//  escala.jsx
//  Escalado de grupos y cálculo de dimensiones
// ============================================================

// Escala la pieza usando ESTATICO como fuente de verdad:
//   1. Escala ESTATICO al tamaño exacto del CSV (no-uniforme: X e Y independientes)
//   2. Escala DINAMICO con los mismos factores (para que elementos PROPORCIONAL mantengan escala)
//   3. Si no hay ESTATICO en la copia, escala el grupo completo como fallback
// baseEstatico: { ancho, alto } medido desde ESTATICO en el template (precalculado una vez por pieza)
// Devuelve { x: scaleX, y: scaleY }
function scalePiezaExact(grupoCopia, targetAncho, targetAlto, baseEstatico) {
    var scaleX = targetAncho / baseEstatico.ancho;
    var scaleY = targetAlto  / baseEstatico.alto;
    var pctX   = scaleX * 100;
    var pctY   = scaleY * 100;

    var estatico = findGroupByNameRecursivo(grupoCopia, "ESTATICO");
    // ESTATICO puede ser PathItem (ej. ESPALDA) — usar findItemByNameRecursivo como fallback
    if (!estatico) estatico = findItemByNameRecursivo(grupoCopia, "ESTATICO");
    var dinamico = findGroupByNameRecursivo(grupoCopia, "DINAMICO");

    if (!estatico) {
        // Fallback: sin ESTATICO de ningún tipo, escalar el grupo completo
        Log.info("scalePiezaExact: sin ESTATICO — escalando grupo completo");
        grupoCopia.left = 0;
        grupoCopia.top  = 0;
        grupoCopia.resize(pctX, pctY, true, true, true, true, Math.min(pctX, pctY), Transformation.TOPLEFT);
        grupoCopia.left = 0;
        grupoCopia.top  = 0;
        return { x: scaleX, y: scaleY };
    }

    // 1. Escalar ESTATICO al tamaño exacto del CSV
    estatico.resize(pctX, pctY, true, true, true, true, Math.min(pctX, pctY), Transformation.TOPLEFT);

    // 2. Escalar DINAMICO con los mismos factores
    //    (mantiene proporciones relativas; aplicarDinamicos reposiciona después)
    if (dinamico) {
        dinamico.resize(pctX, pctY, true, true, true, true, Math.min(pctX, pctY), Transformation.TOPLEFT);
    }

    // 3. Posicionar el grupo al origen
    grupoCopia.left = 0;
    grupoCopia.top  = 0;

    return { x: scaleX, y: scaleY };
}

// Mantener scaleGroupExact como fallback para llamadas externas o futuras
function scaleGroupExact(grupo, targetAnchoCmd, targetAltoCmd, base) {
    var scaleX = targetAnchoCmd / base.ancho;
    var scaleY = targetAltoCmd  / base.alto;
    var pctX   = scaleX * 100;
    var pctY   = scaleY * 100;

    grupo.left = 0;
    grupo.top  = 0;

    grupo.resize(pctX, pctY, true, true, true, true, Math.min(pctX, pctY), Transformation.TOPLEFT);

    grupo.left = 0;
    grupo.top  = 0;

    return { x: scaleX, y: scaleY };
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
//   C) Estimación dinámica: font.capHeight → font.ascent×0.88 → CONFIG.capHeightFactor
// Retorna null si el item no contiene texto o si todo intento falla.

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
    // Buscar capa GENERADO* (nombre variable: GENERADO_XS_S, etc.)
    // Primero intento exacto, luego prefijo, luego activeLayer como fallback.
    try {
        layer = doc.layers.getByName("GENERADO");
    } catch (e) {
        layer = null;
        try {
            for (var _li = 0; _li < doc.layers.length; _li++) {
                if (doc.layers[_li].name.indexOf("GENERADO") === 0) {
                    layer = doc.layers[_li];
                    break;
                }
            }
        } catch (e2) {}
        if (!layer) layer = doc.activeLayer;
        Log._linea("-----", "getTextVisualBounds: layer=" + (layer ? layer.name : "null"));
    }

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

// Fallback: estima la altura visual (cap height) de un TextFrame.
// Jerarquía de cálculo:
//   1. font.capHeight  — propiedad directa si la fuente la expone (fracción del em)
//   2. font.ascent × 0.88 — cap height ≈ 88 % del ascender para fuentes Latin
//   3. CONFIG.capHeightFactor — valor configurado en config.jsx (default 0.72)
// El ancho se toma de geometricBounds (es preciso horizontalmente).
function getTextVisualBoundsFromFont(tf) {
    try {
        var charAttrs = tf.textRange.characterAttributes;
        var fsSizePt  = charAttrs.size; // tamaño del em en puntos
        if (!fsSizePt || fsSizePt <= 0) return null;

        var capFactor = (CONFIG && CONFIG.capHeightFactor) ? CONFIG.capHeightFactor : 0.72;
        var capSource = "CONFIG.capHeightFactor";

        try {
            var font = charAttrs.textFont;
            var ch   = font.capHeight;
            var asc  = font.ascent;
            Log.info("getTextVisualBoundsFromFont: font=" + font.name +
                     " capHeight=" + ch + " ascent=" + asc);
            // capHeight y ascent se esperan como fracción del em (0 < valor < 2)
            if (ch && ch > 0.1 && ch < 1.5) {
                capFactor = ch;
                capSource = "font.capHeight";
            } else if (asc && asc > 0.1 && asc < 1.5) {
                capFactor = asc * 0.88; // cap height ≈ 88 % del ascender
                capSource = "font.ascent×0.88";
            }
        } catch (eFontMetrics) {
            Log.info("getTextVisualBoundsFromFont: métricas de fuente no disponibles");
        }

        var gb        = tf.geometricBounds;      // [L, T, R, B]
        var visAltoPt = fsSizePt * capFactor;
        var fakeBounds = [gb[0], gb[1], gb[2], gb[1] - visAltoPt];
        Log.info("getTextVisualBoundsFromFont OK: h=" +
                 ptToCm(visAltoPt).toFixed(2) + "cm (factor=" +
                 capFactor.toFixed(3) + " src=" + capSource + ")");
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

