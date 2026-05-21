// ============================================================
//  posicionamiento.jsx
//  Funciones de posicionamiento de items dentro de una pieza:
//  desde el borde superior, lateral más cercano, esquina inferior
//  y centrado horizontal.
// ============================================================

// Devuelve los bounds de referencia del ESTATICO para posicionamiento.
// Prioridad: clip mask directo → clip mask en subgrupo → geometricBounds.
// Necesario porque cuando el clip está en un subgrupo interno (estatico.clipped=false),
// geometricBounds del ESTATICO incluye contenido que desborda la silueta visible.
// usarBordeExterior=true: retorna geometricBounds sin buscar clips internos.
// Usar para piezas donde el límite de corte es el grupo externo (PANT_IZQ/DER),
// no el área de clip decorativa interna.
function getEstaticoRefBounds(estatico, fallback, usarBordeExterior) {
    if (!estatico) return fallback;
    if (usarBordeExterior) return estatico.geometricBounds;
    if (estatico.clipped) {
        try { return estatico.pageItems[0].geometricBounds; } catch(e) {}
    }
    if (estatico.pageItems) {
        for (var _i = 0; _i < estatico.pageItems.length; _i++) {
            var _c = estatico.pageItems[_i];
            if (_c.typename === "GroupItem" && _c.clipped) {
                var _cb = buscarClipBounds(_c);
                if (_cb) return _cb;
            }
        }
    }
    return estatico.geometricBounds;
}

function posicionarItemDesdeTop(item, grupoPieza, marginSupCm, nombreJugador, nombrePieza, labelItem) {
    try {
        var estatico  = findGroupByNameRecursivo(grupoPieza, "ESTATICO");
        if (!estatico) estatico = findItemByNameRecursivo(grupoPieza, "ESTATICO");
        var refBounds = getEstaticoRefBounds(estatico, grupoPieza.geometricBounds);
        var piezaTop  = refBounds[1]; // borde superior del ESTATICO en pts

        Log._linea("-----", labelItem + " posicionarDesdeTop | piezaTop=" +
            ptToCm(piezaTop).toFixed(3) + "cm | marginSup=" + marginSupCm.toFixed(3) + "cm" +
            " | refSrc=" + (estatico ? "ESTATICO" : "grupoPieza"));

        var geomBounds = item.geometricBounds; // [L, T, R, B]
        Log._linea("-----", labelItem + " geometricBounds top=" +
            ptToCm(geomBounds[1]).toFixed(3) + "cm" +
            " bottom=" + ptToCm(geomBounds[3]).toFixed(3) + "cm" +
            " alto=" + ptToCm(Math.abs(geomBounds[1]-geomBounds[3])).toFixed(3) + "cm");

        // Para texto: usar el borde visual real (cap height) en lugar del bounding box
        // tipográfico, que incluye espacio vacío por encima del glifo real.
        var itemTopRef = geomBounds[1];
        var vb = getTextVisualBounds(item);
        if (vb) {
            Log._linea("-----", labelItem + " visualBounds top=" +
                ptToCm(vb[1]).toFixed(3) + "cm" +
                " bottom=" + ptToCm(vb[3]).toFixed(3) + "cm" +
                " altoVisual=" + ptToCm(Math.abs(vb[1]-vb[3])).toFixed(3) + "cm" +
                " | espacioVacio=" + ptToCm(Math.abs(geomBounds[1] - vb[1])).toFixed(3) + "cm");
            itemTopRef = vb[1]; // tomar el tope visual real del glifo
        } else {
            Log._linea("-----", labelItem + " sin visualBounds — usando geometricBounds top");
        }

        var marginSupPt = cmToPt(marginSupCm);
        var targetTop   = piezaTop - marginSupPt;

        Log._linea("-----", labelItem + " targetTop=" +
            ptToCm(targetTop).toFixed(3) + "cm | itemTopRef=" +
            ptToCm(itemTopRef).toFixed(3) + "cm | deltaY=" +
            ptToCm(targetTop - itemTopRef).toFixed(3) + "cm");

        // Usar translate() en lugar de item.top = value para que funcione
        // correctamente también en grupos con clip mask (clipped = true),
        // donde el setter .top puede fallar silenciosamente o lanzar error.
        var deltaY = targetTop - itemTopRef;
        item.translate(0, deltaY);

        var postBounds = item.geometricBounds;
        Log._linea("-----", labelItem + " POST geomTop=" +
            ptToCm(postBounds[1]).toFixed(3) + "cm | esperado geomTop=" +
            ptToCm(geomBounds[1] + deltaY).toFixed(3) + "cm");

        Log.ok(nombrePieza + " | " + nombreJugador +
               ": " + labelItem + " posicionado (sup:" + marginSupCm.toFixed(1) + "cm)" +
               (vb ? " [ref=visual]" : " [ref=geom]"));

    } catch(e) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": " + labelItem + " error al posicionar (" + e.message + ") — omitido");
    }
}

// ladoForzado: "IZQ", "DER", o null/undefined para auto-detectar por posición del item.
// Referencia: usa clip mask bounds cuando ESTATICO está clipped (área visible real),
// igual que posicionarEtiqueta. Esto hace que los márgenes CSV sean relativos al
// borde visible de la silueta, no al contenido desbordante.
function posicionarItemDesdeLatMasCercano(item, grupoPieza, marginLatCm, nombreJugador, nombrePieza, labelItem, ladoForzado) {
    try {
        var estatico   = findGroupByNameRecursivo(grupoPieza, "ESTATICO");
        if (!estatico) estatico = findItemByNameRecursivo(grupoPieza, "ESTATICO");
        var refBounds  = getEstaticoRefBounds(estatico, grupoPieza.geometricBounds);
        var piezaLeft  = refBounds[0];
        var piezaRight = refBounds[2];
        var _latSrcRef = estatico ? "ESTATICO-contenido" : "grupoPieza";

        var itemBounds  = item.geometricBounds;
        var itemAncho   = Math.abs(itemBounds[2] - itemBounds[0]);
        var itemCenterX = (itemBounds[0] + itemBounds[2]) / 2;
        var estCenterX  = (piezaLeft + piezaRight) / 2;

        var ladoDecidido = ladoForzado
                           ? trim(ladoForzado + "").toUpperCase()
                           : (itemCenterX < estCenterX ? "IZQ" : "DER");

        Log._linea("-----", labelItem + " LAT DIAG:" +
            " piezaL=" + ptToCm(piezaLeft).toFixed(3) + "cm" +
            " piezaR=" + ptToCm(piezaRight).toFixed(3) + "cm" +
            " estCentroX=" + ptToCm(estCenterX).toFixed(3) + "cm" +
            " ref=" + _latSrcRef);
        Log._linea("-----", labelItem + " LAT DIAG:" +
            " itemL=" + ptToCm(itemBounds[0]).toFixed(3) + "cm" +
            " itemR=" + ptToCm(itemBounds[2]).toFixed(3) + "cm" +
            " itemCentroX=" + ptToCm(itemCenterX).toFixed(3) + "cm" +
            " ancho=" + ptToCm(itemAncho).toFixed(3) + "cm");
        Log._linea("-----", labelItem + " LAT DIAG: decision=" + ladoDecidido +
            (ladoForzado ? " (FORZADO)" : " (auto)") +
            " margin=" + marginLatCm.toFixed(3) + "cm");

        var marginLatPt = cmToPt(marginLatCm);

        if (ladoDecidido === "IZQ") {
            item.left = piezaLeft + marginLatPt;
            var _postLat = item.geometricBounds;
            Log._linea("-----", labelItem + " LAT POST: itemL=" + ptToCm(_postLat[0]).toFixed(3) +
                "cm distIzq=" + ptToCm(_postLat[0] - piezaLeft).toFixed(3) + "cm");
            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": " + labelItem + " posicionado (lat-izq:" + marginLatCm.toFixed(1) + "cm)");
        } else {
            item.left = piezaRight - marginLatPt - itemAncho;
            var _postLat2 = item.geometricBounds;
            Log._linea("-----", labelItem + " LAT POST: itemR=" + ptToCm(_postLat2[2]).toFixed(3) +
                "cm distDer=" + ptToCm(piezaRight - _postLat2[2]).toFixed(3) + "cm");
            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": " + labelItem + " posicionado (lat-der:" + marginLatCm.toFixed(1) + "cm)");
        }
        return ladoDecidido;
    } catch(e) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": " + labelItem + " error al posicionar lat (" + e.message + ") — omitido");
        return null;
    }
}

function posicionarEtiqueta(etiqueta, grupoPieza, marginInfCm, marginLatCm, lado, nombreJugador, nombrePieza, labelEtiqueta) {
    try {
        var estatico    = findGroupByNameRecursivo(grupoPieza, "ESTATICO");
        if (!estatico) estatico = findItemByNameRecursivo(grupoPieza, "ESTATICO");
        var refBounds   = getEstaticoRefBounds(estatico, grupoPieza.geometricBounds);
        var piezaLeft   = refBounds[0];
        var piezaRight  = refBounds[2];
        var piezaBottom = refBounds[3];
        var _etqSrcRef  = estatico ? "ESTATICO-contenido" : "grupoPieza";

        Log._linea("-----", labelEtiqueta + " ETQ DIAG: refBounds=" +
            "[L=" + ptToCm(piezaLeft).toFixed(3) + " T=" + ptToCm(refBounds[1]).toFixed(3) +
            " R=" + ptToCm(piezaRight).toFixed(3) + " B=" + ptToCm(piezaBottom).toFixed(3) + "]cm" +
            " src=" + _etqSrcRef);

        var etqBounds = etiqueta.geometricBounds;
        var etqAncho  = Math.abs(etqBounds[2] - etqBounds[0]);
        var etqAlto   = Math.abs(etqBounds[1] - etqBounds[3]);

        Log._linea("-----", labelEtiqueta + " ETQ DIAG: etiqueta antes=" +
            "[L=" + ptToCm(etqBounds[0]).toFixed(3) + " T=" + ptToCm(etqBounds[1]).toFixed(3) +
            " R=" + ptToCm(etqBounds[2]).toFixed(3) + " B=" + ptToCm(etqBounds[3]).toFixed(3) + "]cm" +
            " ancho=" + ptToCm(etqAncho).toFixed(3) + "cm alto=" + ptToCm(etqAlto).toFixed(3) + "cm");

        var marginInfPt = cmToPt(marginInfCm);
        var marginLatPt = cmToPt(marginLatCm);

        var dinamicoPieza = findGroupByNameRecursivo(grupoPieza, "DINAMICO");
        var costillaIzq   = dinamicoPieza
                            ? findItemByNameRecursivo(dinamicoPieza, "COSTILLA_IZQ")
                            : null;
        var costillaDer   = dinamicoPieza
                            ? findItemByNameRecursivo(dinamicoPieza, "COSTILLA_DER")
                            : null;

        Log._linea("-----", labelEtiqueta + " ETQ DIAG: costillaIzq=" +
            (costillaIzq ? ("[L=" + ptToCm(costillaIzq.geometricBounds[0]).toFixed(3) + " R=" + ptToCm(costillaIzq.geometricBounds[2]).toFixed(3) + "]cm hidden=" + costillaIzq.hidden) : "null") +
            " costillaDer=" +
            (costillaDer ? ("[L=" + ptToCm(costillaDer.geometricBounds[0]).toFixed(3) + " R=" + ptToCm(costillaDer.geometricBounds[2]).toFixed(3) + "]cm hidden=" + costillaDer.hidden) : "null"));

        var refLeft  = costillaIzq ? costillaIzq.geometricBounds[0] : piezaLeft;
        var refRight = costillaDer ? costillaDer.geometricBounds[2] : piezaRight;

        var refBottom = piezaBottom;
        if (costillaIzq) {
            var cIzqB      = costillaIzq.geometricBounds;
            refBottom = cIzqB[1] - Math.abs(cIzqB[1] - cIzqB[3]);
        } else if (costillaDer) {
            var cDerB      = costillaDer.geometricBounds;
            refBottom = cDerB[1] - Math.abs(cDerB[1] - cDerB[3]);
        }

        Log._linea("-----", labelEtiqueta + " ETQ DIAG: refLeft=" + ptToCm(refLeft).toFixed(3) + "cm" +
            " refRight=" + ptToCm(refRight).toFixed(3) + "cm" +
            " refBottom=" + ptToCm(refBottom).toFixed(3) + "cm" +
            " lado=" + lado + " marginLat=" + marginLatCm.toFixed(3) + "cm" +
            " marginInf=" + marginInfCm.toFixed(3) + "cm");

        var nuevoTop  = refBottom + marginInfPt + etqAlto;
        var nuevoLeft = (lado === "IZQ")
                        ? refLeft  + marginLatPt
                        : refRight - marginLatPt - etqAncho;

        Log._linea("-----", labelEtiqueta + " ETQ DIAG: nuevoLeft=" + ptToCm(nuevoLeft).toFixed(3) + "cm" +
            " nuevoTop=" + ptToCm(nuevoTop).toFixed(3) + "cm");

        etiqueta.left = nuevoLeft;
        etiqueta.top  = nuevoTop;

        var etqBoundsPost = etiqueta.geometricBounds;
        Log._linea("-----", labelEtiqueta + " ETQ DIAG: post=" +
            "[L=" + ptToCm(etqBoundsPost[0]).toFixed(3) + " T=" + ptToCm(etqBoundsPost[1]).toFixed(3) +
            " R=" + ptToCm(etqBoundsPost[2]).toFixed(3) + " B=" + ptToCm(etqBoundsPost[3]).toFixed(3) + "]cm" +
            " distIzqRef=" + ptToCm(etqBoundsPost[0] - refLeft).toFixed(3) + "cm" +
            " distBotRef=" + ptToCm(etqBoundsPost[3] - refBottom).toFixed(3) + "cm");

        Log.ok(nombrePieza + " | " + nombreJugador +
               ": " + labelEtiqueta + " posicionada (inf:" +
               marginInfCm.toFixed(1) + "cm, lat:" +
               marginLatCm.toFixed(1) + "cm, lado:" + lado + ")");

    } catch(e) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": " + labelEtiqueta + " error al posicionar (" + e.message + ") — omitida");
    }
}

// Centra horizontalmente `item` dentro de `grupoPieza`.
// Usa ESTATICO.geometricBounds como referencia de pieza cuando existe (igual que
// posicionarItemDesdeLatMasCercano), para evitar que elementos de DINAMICO que
// desborden la silueta inflen el bounding box y desplacen el centro calculado.
// Funciona tanto con TextFrames como con GroupItem/PathItem.
function centrarHorizontalmente(item, grupoPieza) {
    try {
        var _estatico  = findGroupByNameRecursivo(grupoPieza, "ESTATICO");
        if (!_estatico) {
            _estatico = findItemByNameRecursivo(grupoPieza, "ESTATICO");
        }
        var _refBounds = getEstaticoRefBounds(_estatico, grupoPieza.geometricBounds);
        var piezaCentroX = (_refBounds[0] + _refBounds[2]) / 2;

        // ── DIAGNÓSTICO: tipo y justificación ANTES del cambio ──
        var isText    = (item.typename === "TextFrame");
        var kindStr   = "n/a";
        var justAntes = "n/a";
        if (isText) {
            try {
                kindStr = (item.kind === TextType.POINTTEXT) ? "POINT"
                        : (item.kind === TextType.AREATEXT)  ? "AREA"
                        : "PATH";
            } catch(ek) { kindStr = "err"; }
            try {
                var jVal = item.textRange.paragraphAttributes.justification;
                justAntes = (jVal === Justification.LEFT)   ? "LEFT"
                          : (jVal === Justification.CENTER) ? "CENTER"
                          : (jVal === Justification.RIGHT)  ? "RIGHT"
                          : String(jVal);
            } catch(ej) { justAntes = "err"; }
        }
        var bAntesCambio = item.geometricBounds;
        Log._linea("-----",
            "centrarH tipo=" + kindStr + " justAntes=" + justAntes +
            " geomAntesJust=[" + ptToCm(bAntesCambio[0]).toFixed(3) + "," + ptToCm(bAntesCambio[2]).toFixed(3) + "]");

        // ── Establecer justificación CENTER ──
        if (isText) {
            try {
                item.textRange.paragraphAttributes.justification = Justification.CENTER;
            } catch(e) {}
        }

        // ── DIAGNÓSTICO: bounds DESPUÉS del cambio de justificación ──
        var bDespuesJust = item.geometricBounds;
        Log._linea("-----",
            "centrarH geomDespuesJust=[" + ptToCm(bDespuesJust[0]).toFixed(3) + "," + ptToCm(bDespuesJust[2]).toFixed(3) + "]" +
            " shiftX=" + ptToCm(bDespuesJust[0] - bAntesCambio[0]).toFixed(3));

        // ── Calcular deltaX y traducir ──
        var itemBounds = bDespuesJust;
        var itemAncho  = Math.abs(itemBounds[2] - itemBounds[0]);
        var targetLeft = piezaCentroX - (itemAncho / 2);
        var deltaX     = targetLeft - itemBounds[0];

        Log._linea("-----",
            "centrarH ref=[" + ptToCm(_refBounds[0]).toFixed(3) + "," + ptToCm(_refBounds[2]).toFixed(3) + "]" +
            (_estatico ? "(ESTATICO)" : "(grupoPieza)") +
            " centroX=" + ptToCm(piezaCentroX).toFixed(3) +
            " ancho=" + ptToCm(itemAncho).toFixed(3) +
            " deltaX=" + ptToCm(deltaX).toFixed(3));

        item.translate(deltaX, 0);

        // ── DIAGNÓSTICO: bounds y error DESPUÉS del translate ──
        var bPost = item.geometricBounds;
        var centroPost = (bPost[0] + bPost[2]) / 2;
        var errorX     = centroPost - piezaCentroX;
        var movReal    = bPost[0] - itemBounds[0];
        Log._linea("-----",
            "centrarH POST=[" + ptToCm(bPost[0]).toFixed(3) + "," + ptToCm(bPost[2]).toFixed(3) + "]" +
            " movReal=" + ptToCm(movReal).toFixed(3) +
            " esperado=" + ptToCm(deltaX).toFixed(3) +
            " errorX=" + ptToCm(errorX).toFixed(3));

        // ── Segunda pasada si el error supera 0.1cm ──
        if (Math.abs(errorX) > cmToPt(0.1)) {
            var correccion = -errorX;
            item.translate(correccion, 0);
            var bFinal = item.geometricBounds;
            var errorFinal = ((bFinal[0] + bFinal[2]) / 2) - piezaCentroX;
            Log._linea("-----",
                "centrarH CORRECCION=" + ptToCm(correccion).toFixed(3) +
                " FINAL=[" + ptToCm(bFinal[0]).toFixed(3) + "," + ptToCm(bFinal[2]).toFixed(3) + "]" +
                " errorFinal=" + ptToCm(errorFinal).toFixed(3));
        }

    } catch(e) {
        Log._linea("-----", "centrarH ERROR: " + e.message);
    }
}
