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
        var _estBounds = getEstaticoRefBounds(_estRef, grupoPieza.geometricBounds);
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
// Después del resize el borde inferior de la línea se ancla al borde inferior de ESTATICO.
// Devuelve geometricBounds del clip path interno de un grupo con clipped=true.
// Usa buscarClipBounds (mismo patrón que getEstaticoRefBounds en posicionamiento.jsx):
// busca el pageItem con clipping===true dentro del grupo.
function getLineaClipBounds(item) {
    try {
        if (typeof item.clipped !== "undefined" && item.clipped) {
            return buscarClipBounds(item);
        }
    } catch(e) {}
    return null;
}

function procesarLineaManga(item, lado, targetAncho, targetAlto, ref, nombreJugador, nombrePieza, factorPieza, grupoPieza) {
    if (!item) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": MANGA_LINEA_" + lado + " no encontrada — omitida");
        return;
    }

    // Detectar si el item es contenido dentro de un clip group sin nombre
    // (caso MANGA_DER: <Recortar grupo> contiene MANGA_LINEA_*).
    // En este caso:
    //   - Escalar el item (contenido) directo usando sus propios bounds como referencia
    //     → el elemento nombrado queda exactamente al tamaño del CSV
    //   - Para posicionar (translate/snap) usar el clip group padre
    //     → clip path y contenido se mueven juntos
    var clipGroupParent = null;
    if (item.parent && item.parent.typename === "GroupItem" &&
        typeof item.parent.clipped !== "undefined" && item.parent.clipped) {
        clipGroupParent = item.parent;
    }

    Log.info(nombrePieza + " | " + nombreJugador +
             ": MANGA_LINEA_" + lado + " CSV → ANCHO=" + targetAncho +
             " ALTO=" + targetAlto + " REF=" + ref +
             (clipGroupParent ? " [en clip group]" : ""));

    if (ref === "PROPORCIONAL") {
        Log.ok(nombrePieza + " | " + nombreJugador +
               ": MANGA_LINEA_" + lado + " → proporcional (escala con pieza)");
        return;
    }

    try {
        var boundsAntes = item.geometricBounds;
        var leftAntes   = boundsAntes[0];
        var rightAntes  = boundsAntes[2];

        // refBounds para calcular factores de escala:
        // - MANGA_IZQ (item.clipped=true, item ES el clip group):
        //     usar clip path bounds (sleeve outline) como referencia.
        //     Escalar el clip group completo → contenido y clip path escalan juntos.
        // - MANGA_DER (item es contenido dentro de clip group padre):
        //     usar bounds del item (contenido) directamente → el elemento
        //     nombrado queda exactamente al tamaño CSV. El clip path (sleeve)
        //     es más grande y no restringe la visibilidad del contenido escalado.
        var _clipBounds0 = null;
        if (!clipGroupParent && typeof item.clipped !== "undefined" && item.clipped) {
            _clipBounds0 = buscarClipBounds(item);
        }
        var refBounds = _clipBounds0 || boundsAntes;
        if (_clipBounds0) {
            Log._linea("-----", nombrePieza + " | " + nombreJugador +
                ": LINEA_" + lado + " clipped=SI → refBounds desde clipPath" +
                " W=" + ptToCm(Math.abs(_clipBounds0[2]-_clipBounds0[0])).toFixed(3) +
                "cm H=" + ptToCm(Math.abs(_clipBounds0[1]-_clipBounds0[3])).toFixed(3) + "cm");
        }

        if (ref === "ANCHO" && !isNaN(targetAncho) && targetAncho > 0) {
            var anchoRealCm = ptToCm(Math.abs(refBounds[2] - refBounds[0]));
            if (anchoRealCm <= 0) return;
            var factorAncho = (targetAncho / anchoRealCm) * 100;

            Log.info(nombrePieza + " | " + nombreJugador +
                     ": MANGA_LINEA_" + lado + " refAncho=" + anchoRealCm.toFixed(4) +
                     "cm factor=" + factorAncho.toFixed(2) + "% → target=" + targetAncho.toFixed(1) + "cm");

            item.resize(factorAncho, 100, true, true, true, true, 100, Transformation.TOPLEFT);

            var boundsDespues = item.geometricBounds;
            var nuevoAncho    = Math.abs(boundsDespues[2] - boundsDespues[0]);
            item.left = (lado === "IZQ") ? leftAntes : rightAntes - nuevoAncho;

            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": MANGA_LINEA_" + lado + " → ancho " + targetAncho.toFixed(1) + "cm");

        } else if (ref === "ALTO" && !isNaN(targetAlto) && targetAlto > 0) {
            var altoRealCm = ptToCm(Math.abs(refBounds[1] - refBounds[3]));
            if (altoRealCm <= 0) return;
            var factorAlto = (targetAlto / altoRealCm) * 100;

            Log.info(nombrePieza + " | " + nombreJugador +
                     ": MANGA_LINEA_" + lado + " refAlto=" + altoRealCm.toFixed(4) +
                     "cm factor=" + factorAlto.toFixed(2) + "% → target=" + targetAlto.toFixed(1) + "cm");

            item.resize(100, factorAlto, true, true, true, true, 100, Transformation.TOPLEFT);
            item.left = boundsAntes[0];

            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": MANGA_LINEA_" + lado + " → alto " + targetAlto.toFixed(1) + "cm");

        } else if (ref === "AMBOS" && !isNaN(targetAncho) && targetAncho > 0 && !isNaN(targetAlto) && targetAlto > 0) {
            var anchoRealCmA = ptToCm(Math.abs(refBounds[2] - refBounds[0]));
            var altoRealCmA  = ptToCm(Math.abs(refBounds[1] - refBounds[3]));
            if (anchoRealCmA <= 0 || altoRealCmA <= 0) return;
            var factorAnchoA = (targetAncho / anchoRealCmA) * 100;
            var factorAltoA  = (targetAlto  / altoRealCmA)  * 100;

            Log.info(nombrePieza + " | " + nombreJugador +
                     ": MANGA_LINEA_" + lado + " refAncho=" + anchoRealCmA.toFixed(4) +
                     "cm refAlto=" + altoRealCmA.toFixed(4) +
                     "cm factorAncho=" + factorAnchoA.toFixed(2) +
                     "% factorAlto=" + factorAltoA.toFixed(2) + "% → target=" +
                     targetAncho.toFixed(1) + "x" + targetAlto.toFixed(1) + "cm");

            item.resize(factorAnchoA, factorAltoA, true, true, true, true, 100, Transformation.TOPLEFT);

            var boundsDespuesA = item.geometricBounds;
            var nuevoAnchoA    = Math.abs(boundsDespuesA[2] - boundsDespuesA[0]);
            item.left = (lado === "IZQ") ? leftAntes : rightAntes - nuevoAnchoA;

            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": MANGA_LINEA_" + lado + " → ambos " + targetAncho.toFixed(1) +
                   "x" + targetAlto.toFixed(1) + "cm");

        } else {
            Log.error(nombrePieza + " | " + nombreJugador +
                     ": MANGA_LINEA_" + lado + " REF='" + ref +
                     "' no reconocido o valores inválidos (ANCHO=" + targetAncho +
                     " ALTO=" + targetAlto + ") — no escalada");
        }

        // ── Anclar borde inferior e horizontal al ESTATICO ────────────────
        if (grupoPieza) {
            var _estRef = findGroupByNameRecursivo(grupoPieza, "ESTATICO");
            if (!_estRef) {
                _estRef = findItemByNameRecursivo(grupoPieza, "ESTATICO");
            }
            var _estBounds = getEstaticoRefBounds(_estRef, grupoPieza.geometricBounds);
            var _estBot    = _estBounds[3];
            var _estLeft   = _estBounds[0];
            var _estRight  = _estBounds[2];

            Log._linea("-----", nombrePieza + " | " + nombreJugador +
                ": LINEA_" + lado + " ANCHOR estL=" + ptToCm(_estLeft).toFixed(3) +
                "cm estT=" + ptToCm(_estBounds[1]).toFixed(3) +
                "cm estR=" + ptToCm(_estRight).toFixed(3) +
                "cm estB=" + ptToCm(_estBot).toFixed(3) + "cm");

            // snapItem: el objeto a trasladar.
            //   MANGA_IZQ: item (el clip group); snap ref = clip path bounds del item
            //   MANGA_DER: clipGroupParent (mueve clip path + contenido juntos);
            //              snap ref = bounds del contenido (item, ya escalado al target)
            var snapItem = clipGroupParent || item;
            var _posRef  = clipGroupParent
                           ? item.geometricBounds
                           : (getLineaClipBounds(item) || item.geometricBounds);

            var _posH    = Math.abs(_posRef[1] - _posRef[3]);
            var _targetT = _estBot + _posH;
            var _deltaY  = _targetT - _posRef[1];

            Log._linea("-----", nombrePieza + " | " + nombreJugador +
                ": LINEA_" + lado + " ANTES L=" + ptToCm(_posRef[0]).toFixed(3) +
                "cm T=" + ptToCm(_posRef[1]).toFixed(3) +
                "cm R=" + ptToCm(_posRef[2]).toFixed(3) +
                "cm B=" + ptToCm(_posRef[3]).toFixed(3) +
                "cm targetT=" + ptToCm(_targetT).toFixed(3) + "cm deltaY=" + ptToCm(_deltaY).toFixed(3) + "cm");

            snapItem.translate(0, _deltaY);

            // Snap horizontal (re-evaluar bounds post-translate vertical)
            var _posRefX = clipGroupParent
                           ? item.geometricBounds
                           : (getLineaClipBounds(snapItem) || snapItem.geometricBounds);
            if (lado === "IZQ") {
                snapItem.translate(_estLeft - _posRefX[0], 0);
            } else {
                snapItem.translate(_estRight - _posRefX[2], 0);
            }

            var _itmBPost = item.geometricBounds;
            Log.ok(nombrePieza + " | " + nombreJugador +
                ": MANGA_LINEA_" + lado + " anclada a ESTATICO" +
                " → left=" + ptToCm(_itmBPost[0]).toFixed(3) +
                "cm top=" + ptToCm(_itmBPost[1]).toFixed(3) +
                "cm bot=" + ptToCm(_itmBPost[3]).toFixed(3) + "cm");
        }

    } catch(e) {
        Log.error(nombrePieza + " | " + nombreJugador +
                 ": MANGA_LINEA_" + lado + " error (" + e.message + ") — omitida");
    }
}

// ============================================================
//  PROCESAMIENTO DE LINEAS ADIDAS (manga ranglan)
// ============================================================
// ANCHO fijo según CSV. Alto calculado dinámicamente:
//   ES_RANGLAN=SI → alto = alto_ESTATICO - marginInf
//                   posición: top alineado al top de ESTATICO
//   ES_RANGLAN=NO → posiciona desde el borde inferior del ESTATICO
//                   (igual que ESCUDO en manga)
// Centrado horizontalmente sobre el ESTATICO.
function procesarLineasAdidas(item, suf, targetAncho, ref, marginInf, esRanglan, grupoPieza, nombreJugador, nombrePieza) {
    if (!item) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": LINEAS_ADIDAS (manga " + suf + ") no encontrada — omitida");
        return;
    }

    Log.info(nombrePieza + " | " + nombreJugador +
             ": LINEAS_ADIDAS CSV → ANCHO=" + targetAncho +
             " REF=" + ref + " MARGIN_INF=" + marginInf + " ES_RANGLAN=" + esRanglan);

    try {
        // ── Obtener bounds del ESTATICO ──────────────────────
        var _estRef = findGroupByNameRecursivo(grupoPieza, "ESTATICO");
        if (!_estRef) _estRef = findItemByNameRecursivo(grupoPieza, "ESTATICO");
        var _estBounds = getEstaticoRefBounds(_estRef, grupoPieza.geometricBounds);
        var estTop    = _estBounds[1]; // borde superior (mayor Y en coordenadas AI)
        var estBottom = _estBounds[3]; // borde inferior (menor Y)
        var estLeft   = _estBounds[0];
        var estRight  = _estBounds[2];
        var estAlto   = Math.abs(estTop - estBottom);

        // ── 1. Escalar ANCHO ─────────────────────────────────
        if (ref === "ANCHO" && !isNaN(targetAncho) && targetAncho > 0) {
            var boundsAntes = item.geometricBounds;
            var anchoActCm  = ptToCm(Math.abs(boundsAntes[2] - boundsAntes[0]));
            if (anchoActCm > 0) {
                var factorAncho = (targetAncho / anchoActCm) * 100;
                item.resize(factorAncho, 100, true, true, true, true, 100, Transformation.TOPLEFT);
                Log.ok(nombrePieza + " | " + nombreJugador +
                       ": LINEAS_ADIDAS → ancho " + targetAncho.toFixed(1) + "cm");
            }
        }
        // ref=PROPORCIONAL: no resize de ancho

        // ── 2. Alto dinámico (ranglan) o posicionado desde inf ──
        var marginInfPt = cmToPt(isNaN(marginInf) ? 0 : marginInf);

        if (esRanglan === "SI") {
            // Alto = alto_ESTATICO − marginInf
            var targetAltoPt = estAlto - marginInfPt;
            if (targetAltoPt > 0) {
                var boundsParaAlto = item.geometricBounds;
                var altoActPt = Math.abs(boundsParaAlto[1] - boundsParaAlto[3]);
                if (altoActPt > 0) {
                    var factorAlto = (targetAltoPt / altoActPt) * 100;
                    item.resize(100, factorAlto, true, true, true, true, 100, Transformation.TOPLEFT);
                    Log.ok(nombrePieza + " | " + nombreJugador +
                           ": LINEAS_ADIDAS → alto dinámico " +
                           ptToCm(targetAltoPt).toFixed(2) + "cm (ranglan)");
                }
            }

            // Alinear top del item con top del ESTATICO
            var bPost1 = item.geometricBounds;
            item.translate(0, estTop - bPost1[1]);

        } else {
            // Posicionar desde borde inferior: bottom_item = estBottom + marginInf
            var bPost2    = item.geometricBounds;
            var itemAlto2 = Math.abs(bPost2[1] - bPost2[3]);
            item.translate(0, (estBottom + marginInfPt + itemAlto2) - bPost2[1]);
        }

        // ── 3. Centrar horizontalmente ───────────────────────
        var centerX  = (estLeft + estRight) / 2;
        var bCentrar = item.geometricBounds;
        var itemMidX = (bCentrar[0] + bCentrar[2]) / 2;
        item.translate(centerX - itemMidX, 0);

        var bFinal = item.geometricBounds;
        Log.ok(nombrePieza + " | " + nombreJugador +
               ": LINEAS_ADIDAS posicionada → left=" + ptToCm(bFinal[0]).toFixed(2) +
               "cm top=" + ptToCm(bFinal[1]).toFixed(2) +
               "cm bot=" + ptToCm(bFinal[3]).toFixed(2) + "cm");

    } catch(e) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": LINEAS_ADIDAS error (" + e.message + ") — omitida");
    }
}

// Línea inferior
// REF=ALTO  → fija el alto al valor del CSV, ancho escala con la manga (comportamiento original)
// REF=ANCHO → fija el ancho al valor del CSV, alto escala con la manga
// REF=PROPORCIONAL → escala con la pieza (no se aplica resize adicional)
function procesarLineaMangaInf(grupoLinea, targetAncho, targetAlto, ref, nombreJugador, nombrePieza, factorPieza, grupoPieza) {
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

            // Anclar borde inferior al borde inferior del clip (ESTATICO)
            if (grupoPieza) {
                var _infEstRef = findGroupByNameRecursivo(grupoPieza, "ESTATICO");
                if (!_infEstRef) _infEstRef = findItemByNameRecursivo(grupoPieza, "ESTATICO");
                var _infClipB  = getEstaticoRefBounds(_infEstRef, grupoPieza.geometricBounds);
                var _infBot    = _infClipB[3];
                grupoLinea.translate(0, _infBot - boundsDespues[3]);
                grupoLinea.left = _infClipB[0]; // snap horizontal al borde izq de ESTATICO
            } else {
                grupoLinea.left = leftAntes;
                grupoLinea.top  = bottomAntes + nuevoAlto;
            }

            var _postInf = grupoLinea.geometricBounds;
            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": MANGA_LINEA_INF → alto " + ptToCm(nuevoAlto).toFixed(4) + "cm (target " + targetAlto.toFixed(1) + "cm)" +
                   " POST L=" + ptToCm(_postInf[0]).toFixed(3) +
                   " T=" + ptToCm(_postInf[1]).toFixed(3) +
                   " R=" + ptToCm(_postInf[2]).toFixed(3) +
                   " B=" + ptToCm(_postInf[3]).toFixed(3) +
                   " W=" + ptToCm(Math.abs(_postInf[2]-_postInf[0])).toFixed(3));

        } else if (ref === "ANCHO" && !isNaN(targetAncho) && targetAncho > 0) {
            var anchoActualCm = ptToCm(Math.abs(boundsAntes[2] - boundsAntes[0]));
            if (anchoActualCm <= 0) return;
            var factorAncho2  = (targetAncho / anchoActualCm) * 100;

            grupoLinea.resize(factorAncho2, 100, true, true, true, true, 100, Transformation.BOTTOMLEFT);
            var _infBotA = grupoLinea.geometricBounds;
            if (grupoPieza) {
                var _infEstRefA = findGroupByNameRecursivo(grupoPieza, "ESTATICO");
                if (!_infEstRefA) _infEstRefA = findItemByNameRecursivo(grupoPieza, "ESTATICO");
                var _infClipBA  = getEstaticoRefBounds(_infEstRefA, grupoPieza.geometricBounds);
                grupoLinea.translate(0, _infClipBA[3] - _infBotA[3]);
                grupoLinea.left = _infClipBA[0]; // snap horizontal al borde izq de ESTATICO
            } else {
                grupoLinea.left = leftAntes;
                grupoLinea.top  = bottomAntes + Math.abs(_infBotA[1] - _infBotA[3]);
            }

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
