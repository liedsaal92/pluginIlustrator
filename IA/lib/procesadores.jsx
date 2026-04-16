// ============================================================
//  procesadores.jsx
//  Procesadores especializados de elementos con lógica REF:
//  costillas y líneas de manga (laterales e inferior).
// ============================================================

// ============================================================
//  PROCESAMIENTO DE COSTILLAS
// ============================================================

// REF=ANCHO → fija el ancho al valor del CSV, alto escala con la pieza (comportamiento original)
// REF=ALTO  → fija el alto al valor del CSV, ancho escala con la pieza
// REF=PROPORCIONAL → escala con la pieza (no se aplica resize adicional)
function procesarCostilla(grupoCostilla, lado, targetAncho, targetAlto, ref, grupoPieza, nombreJugador, nombrePieza) {
    if (!grupoCostilla) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": COSTILLA_" + lado + " no encontrada en DINAMICO — omitida");
        return;
    }

    Log.info(nombrePieza + " | " + nombreJugador +
        ": COSTILLA_" + lado + " CSV → REF=" + ref +
        " ANCHO=" + targetAncho + "cm ALTO=" + targetAlto + "cm");

    if (ref === "PROPORCIONAL") {
        Log.ok(nombrePieza + " | " + nombreJugador +
               ": COSTILLA_" + lado + " → proporcional (escala con pieza)");
        return;
    }

    try {
        var boundsAntes = grupoCostilla.geometricBounds;
        var leftAntes   = boundsAntes[0];
        var rightAntes  = boundsAntes[2];

        Log.info(nombrePieza + " | " + nombreJugador +
            ": COSTILLA_" + lado + " antes resize:" +
            " ancho=" + ptToCm(Math.abs(rightAntes - leftAntes)).toFixed(3) + "cm" +
            " alto=" + ptToCm(Math.abs(boundsAntes[1] - boundsAntes[3])).toFixed(3) + "cm" +
            " [top=" + ptToCm(boundsAntes[1]).toFixed(3) + " bot=" + ptToCm(boundsAntes[3]).toFixed(3) + "]");

        if (ref === "ANCHO" && !isNaN(targetAncho) && targetAncho > 0) {
            var anchoActCm  = ptToCm(Math.abs(rightAntes - leftAntes));
            if (anchoActCm <= 0) return;
            var factorAncho = (targetAncho / anchoActCm) * 100;

            grupoCostilla.resize(factorAncho, 100, true, true, true, true, 100, Transformation.TOPLEFT);

            var boundsDespues = grupoCostilla.geometricBounds;
            var nuevoAncho    = Math.abs(boundsDespues[2] - boundsDespues[0]);
            grupoCostilla.left = (lado === "IZQ") ? leftAntes : rightAntes - nuevoAncho;

            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": COSTILLA_" + lado + " → ancho " + targetAncho.toFixed(1) + "cm" +
                   " (alto proporcional=" + ptToCm(Math.abs(boundsDespues[1] - boundsDespues[3])).toFixed(3) + "cm)");

        } else if (ref === "ALTO" && !isNaN(targetAlto) && targetAlto > 0) {
            var altoActCm  = ptToCm(Math.abs(boundsAntes[1] - boundsAntes[3]));
            if (altoActCm <= 0) return;
            var factorAlto = (targetAlto / altoActCm) * 100;

            grupoCostilla.resize(100, factorAlto, true, true, true, true, 100, Transformation.TOPLEFT);
            grupoCostilla.left = boundsAntes[0];

            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": COSTILLA_" + lado + " → alto " + targetAlto.toFixed(1) + "cm");

        } else if (ref === "AMBOS" && !isNaN(targetAncho) && targetAncho > 0 && !isNaN(targetAlto) && targetAlto > 0) {
            var anchoActCmA  = ptToCm(Math.abs(rightAntes - leftAntes));
            var altoActCmA   = ptToCm(Math.abs(boundsAntes[1] - boundsAntes[3]));
            if (anchoActCmA <= 0 || altoActCmA <= 0) return;
            var factorAnchoA = (targetAncho / anchoActCmA) * 100;
            var factorAltoA  = (targetAlto  / altoActCmA)  * 100;

            grupoCostilla.resize(factorAnchoA, factorAltoA, true, true, true, true, 100, Transformation.TOPLEFT);

            var boundsDespuesA = grupoCostilla.geometricBounds;
            var nuevoAnchoA    = Math.abs(boundsDespuesA[2] - boundsDespuesA[0]);
            grupoCostilla.left = (lado === "IZQ") ? leftAntes : rightAntes - nuevoAnchoA;

            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": COSTILLA_" + lado + " → ambos " + targetAncho.toFixed(1) + "x" + targetAlto.toFixed(1) + "cm");

        } else {
            Log.info(nombrePieza + " | " + nombreJugador +
                     ": COSTILLA_" + lado + " sin valores válidos en CSV — no escalada");
        }

        // ── Anclar borde inferior al borde inferior del ESTATICO ──────────
        // findGroupByNameRecursivo falla si ESTATICO es PathItem (ej. ESPALDA).
        // Fallback: findItemByNameRecursivo busca cualquier tipo de item.
        var _estRef = findGroupByNameRecursivo(grupoPieza, "ESTATICO");
        if (!_estRef) {
            _estRef = findItemByNameRecursivo(grupoPieza, "ESTATICO");
        }
        var _estSrc    = _estRef ? ("ESTATICO(" + _estRef.typename + ")") : "grupoPieza(fallback)";
        var _estBounds = _estRef ? _estRef.geometricBounds : grupoPieza.geometricBounds;
        var _estBot    = _estBounds[3];
        var _estTop    = _estBounds[1];

        var _cosB   = grupoCostilla.geometricBounds;
        var _cosH   = Math.abs(_cosB[1] - _cosB[3]);
        var _targetT = _estBot + _cosH;
        var _deltaY  = _targetT - _cosB[1];

        Log.info(nombrePieza + " | " + nombreJugador +
            ": COSTILLA_" + lado + " SNAP ref=" + _estSrc +
            " estTop=" + ptToCm(_estTop).toFixed(3) + "cm estBot=" + ptToCm(_estBot).toFixed(3) + "cm" +
            " cosH=" + ptToCm(_cosH).toFixed(3) + "cm" +
            " cosTop_antes=" + ptToCm(_cosB[1]).toFixed(3) + "cm cosBot_antes=" + ptToCm(_cosB[3]).toFixed(3) + "cm" +
            " delta=" + ptToCm(_deltaY).toFixed(3) + "cm");

        grupoCostilla.translate(0, _deltaY);

        var _cosBPost = grupoCostilla.geometricBounds;
        Log.ok(nombrePieza + " | " + nombreJugador +
            ": COSTILLA_" + lado + " anclada a borde inf ESTATICO" +
            " → cosTop=" + ptToCm(_cosBPost[1]).toFixed(3) + "cm cosBot=" + ptToCm(_cosBPost[3]).toFixed(3) + "cm");

    } catch(e) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": COSTILLA_" + lado + " error (" + e.message + ") — omitida");
    }
}

// ============================================================
//  PROCESAMIENTO DE LÍNEAS DE MANGA
// ============================================================

// Líneas laterales (IZQ y DER)
// REF=ANCHO → fija el ancho al valor del CSV, alto escala con la manga (comportamiento original)
// REF=ALTO  → fija el alto al valor del CSV, ancho escala con la manga
// REF=AMBOS → fija ancho Y alto exactos al valor del CSV
// REF=PROPORCIONAL → escala con la pieza (no se aplica resize adicional)
function procesarLineaManga(item, lado, targetAncho, targetAlto, ref, nombreJugador, nombrePieza, factorPieza) {
    if (!item) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": MANGA_LINEA_" + lado + " no encontrada — omitida");
        return;
    }

    // DIAGNÓSTICO: mostrar valores leídos del CSV antes de decidir qué hacer
    Log.info(nombrePieza + " | " + nombreJugador +
             ": MANGA_LINEA_" + lado + " CSV → ANCHO=" + targetAncho +
             " ALTO=" + targetAlto + " REF=" + ref);

    if (ref === "PROPORCIONAL") {
        Log.ok(nombrePieza + " | " + nombreJugador +
               ": MANGA_LINEA_" + lado + " → proporcional (escala con pieza)");
        return;
    }

    try {
        var boundsAntes = item.geometricBounds;
        var leftAntes   = boundsAntes[0];
        var rightAntes  = boundsAntes[2];
        var topAntes    = boundsAntes[1];

        if (ref === "ANCHO" && !isNaN(targetAncho) && targetAncho > 0) {
            var anchoRealCm = ptToCm(Math.abs(rightAntes - leftAntes));
            if (anchoRealCm <= 0) return;
            var factorAncho = (targetAncho / anchoRealCm) * 100;

            Log.info(nombrePieza + " | " + nombreJugador +
                     ": MANGA_LINEA_" + lado + " anchoActual=" + anchoRealCm.toFixed(4) +
                     "cm target=" + targetAncho.toFixed(1) + "cm factor=" + factorAncho.toFixed(2) + "%");

            item.resize(factorAncho, 100, true, true, true, true, 100, Transformation.TOPLEFT);

            var boundsDespues = item.geometricBounds;
            var nuevoAncho    = Math.abs(boundsDespues[2] - boundsDespues[0]);
            item.left = (lado === "IZQ") ? leftAntes : rightAntes - nuevoAncho;
            item.top  = topAntes;

            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": MANGA_LINEA_" + lado + " → ancho " + targetAncho.toFixed(1) + "cm");

        } else if (ref === "ALTO" && !isNaN(targetAlto) && targetAlto > 0) {
            var altoRealCm = ptToCm(Math.abs(boundsAntes[1] - boundsAntes[3]));
            if (altoRealCm <= 0) return;
            var factorAlto = (targetAlto / altoRealCm) * 100;

            Log.info(nombrePieza + " | " + nombreJugador +
                     ": MANGA_LINEA_" + lado + " altoActual=" + altoRealCm.toFixed(4) +
                     "cm target=" + targetAlto.toFixed(1) + "cm factor=" + factorAlto.toFixed(2) + "%");

            item.resize(100, factorAlto, true, true, true, true, 100, Transformation.TOPLEFT);
            item.left = boundsAntes[0];
            item.top  = topAntes;

            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": MANGA_LINEA_" + lado + " → alto " + targetAlto.toFixed(1) + "cm");

        } else if (ref === "AMBOS" && !isNaN(targetAncho) && targetAncho > 0 && !isNaN(targetAlto) && targetAlto > 0) {
            var anchoRealCmA = ptToCm(Math.abs(rightAntes - leftAntes));
            var altoRealCmA  = ptToCm(Math.abs(boundsAntes[1] - boundsAntes[3]));
            if (anchoRealCmA <= 0 || altoRealCmA <= 0) return;
            var factorAnchoA = (targetAncho / anchoRealCmA) * 100;
            var factorAltoA  = (targetAlto  / altoRealCmA)  * 100;

            Log.info(nombrePieza + " | " + nombreJugador +
                     ": MANGA_LINEA_" + lado + " anchoActual=" + anchoRealCmA.toFixed(4) +
                     "cm altoActual=" + altoRealCmA.toFixed(4) +
                     "cm factorAncho=" + factorAnchoA.toFixed(2) +
                     "% factorAlto=" + factorAltoA.toFixed(2) + "%");

            item.resize(factorAnchoA, factorAltoA, true, true, true, true, 100, Transformation.TOPLEFT);

            var boundsDespuesA = item.geometricBounds;
            var nuevoAnchoA    = Math.abs(boundsDespuesA[2] - boundsDespuesA[0]);
            item.left = (lado === "IZQ") ? leftAntes : rightAntes - nuevoAnchoA;
            item.top  = topAntes;

            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": MANGA_LINEA_" + lado + " → ambos " + targetAncho.toFixed(1) +
                   "x" + targetAlto.toFixed(1) + "cm");

        } else {
            Log.error(nombrePieza + " | " + nombreJugador +
                     ": MANGA_LINEA_" + lado + " REF='" + ref +
                     "' no reconocido o valores inválidos (ANCHO=" + targetAncho +
                     " ALTO=" + targetAlto + ") — no escalada");
        }

    } catch(e) {
        Log.error(nombrePieza + " | " + nombreJugador +
                 ": MANGA_LINEA_" + lado + " error (" + e.message + ") — omitida");
    }
}

// Línea inferior
// REF=ALTO  → fija el alto al valor del CSV, ancho escala con la manga (comportamiento original)
// REF=ANCHO → fija el ancho al valor del CSV, alto escala con la manga
// REF=PROPORCIONAL → escala con la pieza (no se aplica resize adicional)
function procesarLineaMangaInf(grupoLinea, targetAncho, targetAlto, ref, nombreJugador, nombrePieza, factorPieza) {
    if (!grupoLinea) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": MANGA_LINEA_INF no encontrada — omitida");
        return;
    }

    if (ref === "PROPORCIONAL") {
        Log.ok(nombrePieza + " | " + nombreJugador +
               ": MANGA_LINEA_INF → proporcional (escala con pieza)");
        return;
    }

    try {
        var boundsAntes = grupoLinea.geometricBounds;
        var leftAntes   = boundsAntes[0];
        var bottomAntes = boundsAntes[3];

        if (ref === "ALTO" && !isNaN(targetAlto) && targetAlto > 0) {
            var altoActualCm = ptToCm(Math.abs(boundsAntes[1] - boundsAntes[3]));
            if (altoActualCm <= 0) return;
            var factorAlto = (targetAlto / altoActualCm) * 100;

            Log.info(nombrePieza + " | " + nombreJugador +
                     ": MANGA_LINEA_INF altoActual=" + altoActualCm.toFixed(4) + "cm target=" + targetAlto.toFixed(1) + "cm factor=" + factorAlto.toFixed(2) + "%");

            grupoLinea.resize(100, factorAlto, true, true, true, true, 100, Transformation.BOTTOMLEFT);

            var boundsDespues = grupoLinea.geometricBounds;
            var nuevoAlto     = Math.abs(boundsDespues[1] - boundsDespues[3]);
            grupoLinea.left = leftAntes;
            grupoLinea.top  = bottomAntes + nuevoAlto;

            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": MANGA_LINEA_INF → alto " + ptToCm(nuevoAlto).toFixed(4) + "cm (target " + targetAlto.toFixed(1) + "cm)");

        } else if (ref === "ANCHO" && !isNaN(targetAncho) && targetAncho > 0) {
            var anchoActualCm = ptToCm(Math.abs(boundsAntes[2] - boundsAntes[0]));
            if (anchoActualCm <= 0) return;
            var factorAncho2  = (targetAncho / anchoActualCm) * 100;

            grupoLinea.resize(factorAncho2, 100, true, true, true, true, 100, Transformation.BOTTOMLEFT);
            grupoLinea.left = leftAntes;
            grupoLinea.top  = bottomAntes + Math.abs(grupoLinea.geometricBounds[1] - grupoLinea.geometricBounds[3]);

            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": MANGA_LINEA_INF → ancho " + targetAncho.toFixed(1) + "cm");

        } else {
            Log.info(nombrePieza + " | " + nombreJugador +
                     ": MANGA_LINEA_INF sin valores válidos en CSV — no escalada");
        }

    } catch(e) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": MANGA_LINEA_INF error (" + e.message + ") — omitida");
    }
}
