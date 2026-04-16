// ============================================================
//  posicionamiento.jsx
//  Funciones de posicionamiento de items dentro de una pieza:
//  desde el borde superior, lateral más cercano, esquina inferior
//  y centrado horizontal.
// ============================================================

function posicionarItemDesdeTop(item, grupoPieza, marginSupCm, nombreJugador, nombrePieza, labelItem) {
    try {
        var estatico  = findGroupByNameRecursivo(grupoPieza, "ESTATICO");
        if (!estatico) estatico = findItemByNameRecursivo(grupoPieza, "ESTATICO");
        var refBounds = estatico ? estatico.geometricBounds
                                 : grupoPieza.geometricBounds;
        var piezaTop  = refBounds[1]; // borde superior del ESTATICO en pts

        var marginSupPt = cmToPt(marginSupCm);
        var targetTop   = piezaTop - marginSupPt;

        // Usar translate() en lugar de item.top = value para que funcione
        // correctamente también en grupos con clip mask (clipped = true),
        // donde el setter .top puede fallar silenciosamente o lanzar error.
        var deltaY = targetTop - item.geometricBounds[1];
        item.translate(0, deltaY);

        Log.ok(nombrePieza + " | " + nombreJugador +
               ": " + labelItem + " posicionado (sup:" + marginSupCm.toFixed(1) + "cm)");

    } catch(e) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": " + labelItem + " error al posicionar (" + e.message + ") — omitido");
    }
}

function posicionarItemDesdeLatMasCercano(item, grupoPieza, marginLatCm, nombreJugador, nombrePieza, labelItem) {
    try {
        var estatico   = findGroupByNameRecursivo(grupoPieza, "ESTATICO");
        if (!estatico) estatico = findItemByNameRecursivo(grupoPieza, "ESTATICO");
        var refBounds  = estatico ? estatico.geometricBounds : grupoPieza.geometricBounds;
        var piezaLeft  = refBounds[0];
        var piezaRight = refBounds[2];

        var itemBounds  = item.geometricBounds;
        var itemAncho   = Math.abs(itemBounds[2] - itemBounds[0]);
        var itemCenterX = (itemBounds[0] + itemBounds[2]) / 2;
        var estCenterX  = (piezaLeft + piezaRight) / 2;

        var marginLatPt = cmToPt(marginLatCm);

        if (itemCenterX < estCenterX) {
            // Elemento a la izquierda → borde izquierdo como referencia
            item.left = piezaLeft + marginLatPt;
            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": " + labelItem + " posicionado (lat-izq:" + marginLatCm.toFixed(1) + "cm)");
        } else {
            // Elemento a la derecha → borde derecho como referencia
            item.left = piezaRight - marginLatPt - itemAncho;
            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": " + labelItem + " posicionado (lat-der:" + marginLatCm.toFixed(1) + "cm)");
        }
    } catch(e) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": " + labelItem + " error al posicionar lat (" + e.message + ") — omitido");
    }
}

function posicionarEtiqueta(etiqueta, grupoPieza, marginInfCm, marginLatCm, lado, nombreJugador, nombrePieza, labelEtiqueta) {
    try {
        var estatico    = findGroupByNameRecursivo(grupoPieza, "ESTATICO");
        if (!estatico) estatico = findItemByNameRecursivo(grupoPieza, "ESTATICO");
        var refBounds   = estatico ? estatico.geometricBounds
                                   : grupoPieza.geometricBounds;
        var piezaLeft   = refBounds[0];
        var piezaRight  = refBounds[2];
        var piezaBottom = refBounds[3];

        var etqBounds = etiqueta.geometricBounds;
        var etqAncho  = Math.abs(etqBounds[2] - etqBounds[0]);
        var etqAlto   = Math.abs(etqBounds[1] - etqBounds[3]);

        var marginInfPt = cmToPt(marginInfCm);
        var marginLatPt = cmToPt(marginLatCm);

        var dinamicoPieza = findGroupByNameRecursivo(grupoPieza, "DINAMICO");
        var costillaIzq   = dinamicoPieza
                            ? findItemByNameRecursivo(dinamicoPieza, "COSTILLA_IZQ")
                            : null;
        var costillaDer   = dinamicoPieza
                            ? findItemByNameRecursivo(dinamicoPieza, "COSTILLA_DER")
                            : null;

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

        var nuevoTop  = refBottom + marginInfPt + etqAlto;
        var nuevoLeft = (lado === "IZQ")
                        ? refLeft  + marginLatPt
                        : refRight - marginLatPt - etqAncho;

        etiqueta.left = nuevoLeft;
        etiqueta.top  = nuevoTop;

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
        var _refBounds = _estatico ? _estatico.geometricBounds
                                   : grupoPieza.geometricBounds;
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
