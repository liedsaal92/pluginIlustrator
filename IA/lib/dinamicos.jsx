// ============================================================
//  dinamicos.jsx
//  Aplicación de elementos dinámicos a cada pieza:
//  nombre, número, logo, costillas, etiqueta, líneas de manga
// ============================================================

function aplicarDinamicos(grupoCopia, jugador, nombrePieza, factorPieza) {

    // Buscar DINAMICO dentro de la copia
    var dinamico = findGroupByNameRecursivo(grupoCopia, "DINAMICO");

    if (!dinamico) {
        Log.info(
            nombrePieza + " | " + jugador.NOMBRE +
            ": sin grupo DINAMICO — solo escalado"
        );
        return;
    }

    // ── NOMBRE ──────────────────────────────────────────────
    var llevaNobreEnEstaPieza = llevaElemento(jugador, nombrePieza, "NOMBRE");
    var itemNombre = findItemByNameRecursivo(dinamico, CONFIG.itemNombre);

    if (itemNombre) {
        Log._linea("-----", nombrePieza + " | " + jugador.NOMBRE +
            ": NOMBRE typename=" + itemNombre.typename +
            " name=" + itemNombre.name);
        if (!llevaNobreEnEstaPieza) {
            itemNombre.hidden = true;
            Log.info(
                nombrePieza + " | " + jugador.NOMBRE +
                ": NOMBRE ocultado (LLEVA_NOMBRE_" +
                inicialPieza(nombrePieza) + "=NO)"
            );
        } else {
            // Si NOMBRE_CAMISETA está vacío en el CSV → ocultar el item
            var textoCamiseta = trim(jugador.NOMBRE_CAMISETA + "");
            if (textoCamiseta === "") {
                itemNombre.hidden = true;
                Log.info(
                    nombrePieza + " | " + jugador.NOMBRE +
                    ": NOMBRE ocultado (NOMBRE_CAMISETA vacio en CSV)"
                );
            } else {
                var tfNombre = (itemNombre.typename === "TextFrame")
                               ? itemNombre
                               : findTextFrameRecursivo(itemNombre);
                if (tfNombre) {
                    tfNombre.contents = textoCamiseta;
                    centrarHorizontalmente(itemNombre, grupoCopia);
                }
            }
        }
    }

    // ── NUMERO ──────────────────────────────────────────────
    var llevaNumeroEnEstaPieza = llevaElemento(jugador, nombrePieza, "NUMERO");
    var itemNumero = findItemByNameRecursivo(dinamico, CONFIG.itemNumero);

    if (itemNumero) {
        if (jugador.TIENE_NUMERO === "NO" || !llevaNumeroEnEstaPieza) {
            itemNumero.hidden = true;
            if (jugador.TIENE_NUMERO === "NO") {
                Log.info(
                    nombrePieza + " | " + jugador.NOMBRE +
                    ": NUMERO ocultado (TIENE_NUMERO=NO)"
                );
            } else {
                Log.info(
                    nombrePieza + " | " + jugador.NOMBRE +
                    ": NUMERO ocultado (LLEVA_NUMERO_" +
                    inicialPieza(nombrePieza) + "=NO)"
                );
            }
        } else {
            // Validar que el número exista
            if (jugador.NUMERO === "" || isNaN(parseFloat(jugador.NUMERO))) {
                Log.error(
                    nombrePieza + " | " + jugador.NOMBRE +
                    ": TIENE_NUMERO=SI pero NUMERO está vacío"
                );
                itemNumero.hidden = true;
            } else {
                if (itemNumero.typename === "TextFrame") {
                    // Mostrar número sin decimales
                    itemNumero.contents = String(parseInt(jugador.NUMERO));
                    centrarHorizontalmente(itemNumero, grupoCopia);
                }
            }
        }
    }

    // ── ESCUDO ──────────────────────────────────────────────
    var grupoEscudo = findGroupByNameRecursivo(dinamico, CONFIG.itemEscudo);

    if (grupoEscudo) {
        var escudoAlto = parseFloat(jugador.ESCUDO_ALTO);
        if (!isNaN(escudoAlto) && escudoAlto > 0) {
            escalarItemDesdecentro(grupoEscudo, escudoAlto, "ALTO");
            Log.ok(nombrePieza + " | " + jugador.NOMBRE +
                   ": ESCUDO → alto " + escudoAlto.toFixed(1) + "cm");
        } else {
            Log.info(
                nombrePieza + " | " + jugador.NOMBRE +
                ": ESCUDO_ALTO inválido (" + jugador.ESCUDO_ALTO +
                ") — escudo no escalado"
            );
        }
    }

    // ── ESCUDO_CENTRAL ──────────────────────────────────────
    var grupoEscudoCentral = findGroupByNameRecursivo(dinamico, "ESCUDO_CENTRAL");

    if (grupoEscudoCentral) {
        var escudoCentralAlto = parseFloat(jugador.ESCUDO_CENTRAL_ALTO);
        if (!isNaN(escudoCentralAlto) && escudoCentralAlto > 0) {
            escalarItemDesdecentro(grupoEscudoCentral, escudoCentralAlto, "ALTO");
            Log.ok(nombrePieza + " | " + jugador.NOMBRE +
                   ": ESCUDO_CENTRAL → alto " + escudoCentralAlto.toFixed(1) + "cm");
        } else {
            Log.info(
                nombrePieza + " | " + jugador.NOMBRE +
                ": ESCUDO_CENTRAL_ALTO inválido (" + jugador.ESCUDO_CENTRAL_ALTO +
                ") — escudo central no escalado"
            );
        }
    }

    // ── NUMERO_FRENTE ────────────────────────────────────────
    var itemNumeroFrente = findItemByNameRecursivo(dinamico, "NUMERO_FRENTE");

    if (itemNumeroFrente) {
        var numeroFrenteRef   = trim((jugador.NUMERO_FRENTE_REF || "") + "").toUpperCase();
        var numeroFrenteAncho = parseFloat(jugador.NUMERO_FRENTE_ANCHO);
        var numeroFrenteAlto  = parseFloat(jugador.NUMERO_FRENTE_ALTO);

        if (numeroFrenteRef === "ANCHO" && !isNaN(numeroFrenteAncho) && numeroFrenteAncho > 0) {
            escalarItemDesdecentro(itemNumeroFrente, numeroFrenteAncho, "ANCHO");
            Log.ok(nombrePieza + " | " + jugador.NOMBRE +
                   ": NUMERO_FRENTE → ancho " + numeroFrenteAncho.toFixed(1) + "cm");
        } else if (numeroFrenteRef === "ALTO" && !isNaN(numeroFrenteAlto) && numeroFrenteAlto > 0) {
            escalarItemDesdecentro(itemNumeroFrente, numeroFrenteAlto, "ALTO");
            Log.ok(nombrePieza + " | " + jugador.NOMBRE +
                   ": NUMERO_FRENTE → alto " + numeroFrenteAlto.toFixed(1) + "cm");
        } else {
            Log.info(nombrePieza + " | " + jugador.NOMBRE +
                     ": NUMERO_FRENTE sin valores válidos en CSV — no escalado");
        }
    }

    // ── SPONSOR_TOP_IZQ ─────────────────────────────────────
    var itemSponsorTopIzq = findItemByNameRecursivo(dinamico, "SPONSOR_TOP_IZQ");

    if (itemSponsorTopIzq) {
        var sponsorTopIzqAncho = parseFloat(jugador.SPONSOR_TOP_IZQ_ANCHO);
        if (!isNaN(sponsorTopIzqAncho) && sponsorTopIzqAncho > 0) {
            escalarItemDesdecentro(itemSponsorTopIzq, sponsorTopIzqAncho, "ANCHO");
            Log.ok(nombrePieza + " | " + jugador.NOMBRE +
                   ": SPONSOR_TOP_IZQ → ancho " + sponsorTopIzqAncho.toFixed(1) + "cm");
        } else {
            Log.info(nombrePieza + " | " + jugador.NOMBRE +
                     ": SPONSOR_TOP_IZQ_ANCHO inválido — no escalado");
        }
    }

    // ── SPONSOR_TOP_DER ─────────────────────────────────────
    var itemSponsorTopDer = findItemByNameRecursivo(dinamico, "SPONSOR_TOP_DER");

    if (itemSponsorTopDer) {
        var sponsorTopDerAncho = parseFloat(jugador.SPONSOR_TOP_DER_ANCHO);
        if (!isNaN(sponsorTopDerAncho) && sponsorTopDerAncho > 0) {
            escalarItemDesdecentro(itemSponsorTopDer, sponsorTopDerAncho, "ANCHO");
            Log.ok(nombrePieza + " | " + jugador.NOMBRE +
                   ": SPONSOR_TOP_DER → ancho " + sponsorTopDerAncho.toFixed(1) + "cm");
        } else {
            Log.info(nombrePieza + " | " + jugador.NOMBRE +
                     ": SPONSOR_TOP_DER_ANCHO inválido — no escalado");
        }
    }

    // ── LOGO_MARCA ───────────────────────────────────────────
    // Escala el logo del fabricante usando ANCHO o ALTO como referencia según CSV.
    // LOGO_MARCA_REF = "ANCHO" → el ancho queda en LOGO_MARCA_ANCHO cm
    // LOGO_MARCA_REF = "ALTO"  → el alto queda en LOGO_MARCA_ALTO cm
    // Si el item no existe o faltan valores en CSV → se omite sin error
    var itemLogoMarca = findItemByNameRecursivo(dinamico, "LOGO_MARCA");

    if (itemLogoMarca) {
        var logoMarcaRef   = trim((jugador.LOGO_MARCA_REF || "") + "").toUpperCase();
        var logoMarcaAncho = parseFloat(jugador.LOGO_MARCA_ANCHO);
        var logoMarcaAlto  = parseFloat(jugador.LOGO_MARCA_ALTO);

        if (logoMarcaRef === "ANCHO" && !isNaN(logoMarcaAncho) && logoMarcaAncho > 0) {
            escalarItemDesdecentro(itemLogoMarca, logoMarcaAncho, "ANCHO");
            Log.ok(nombrePieza + " | " + jugador.NOMBRE +
                   ": LOGO_MARCA → ancho " + logoMarcaAncho.toFixed(1) + "cm");
        } else if (logoMarcaRef === "ALTO" && !isNaN(logoMarcaAlto) && logoMarcaAlto > 0) {
            escalarItemDesdecentro(itemLogoMarca, logoMarcaAlto, "ALTO");
            Log.ok(nombrePieza + " | " + jugador.NOMBRE +
                   ": LOGO_MARCA → alto " + logoMarcaAlto.toFixed(1) + "cm");
        } else {
            Log.info(nombrePieza + " | " + jugador.NOMBRE +
                     ": LOGO_MARCA sin valores válidos en CSV — no escalado");
        }
    }

    // ── COSTILLAS ────────────────────────────────────────────
    // Solo se procesan si el diseño las lleva Y el CSV tiene COSTILLA_ANCHO
    // Si no existe el grupo o falta el valor en CSV → se omite sin error
    if (llevaElemento(jugador, nombrePieza, "COSTILLA")) {
        var costillaAncho = parseFloat(jugador.COSTILLA_ANCHO);
        if (!isNaN(costillaAncho) && costillaAncho > 0) {
            procesarCostilla(
                findItemByNameRecursivo(dinamico, "COSTILLA_IZQ"),
                "IZQ", costillaAncho, grupoCopia, jugador.NOMBRE, nombrePieza
            );
            procesarCostilla(
                findItemByNameRecursivo(dinamico, "COSTILLA_DER"),
                "DER", costillaAncho, grupoCopia, jugador.NOMBRE, nombrePieza
            );
        } else {
            Log.info(
                nombrePieza + " | " + jugador.NOMBRE +
                ": COSTILLA_ANCHO sin valor — costillas omitidas"
            );
        }
    }

    // ── ETIQUETA ─────────────────────────────────────────────
    // Solo en FRENTE, solo si existen los valores en el CSV
    // Si faltan valores o el grupo no existe → omite sin error
    if (nombrePieza === "FRENTE") {
        var etiquetaMarginInf = parseFloat(jugador.ETIQUETA_MARGIN_INF);
        var etiquetaMarginLat = parseFloat(jugador.ETIQUETA_MARGIN_LAT);
        var etiquetaLado      = trim((jugador.ETIQUETA_LADO || "DER") + "").toUpperCase();
        var grupoEtiqueta     = findItemByNameRecursivo(dinamico, "ETIQUETA");

        if (grupoEtiqueta &&
            !isNaN(etiquetaMarginInf) && etiquetaMarginInf >= 0 &&
            !isNaN(etiquetaMarginLat) && etiquetaMarginLat >= 0) {
            posicionarEtiqueta(
                grupoEtiqueta, grupoCopia,
                etiquetaMarginInf, etiquetaMarginLat, etiquetaLado,
                jugador.NOMBRE, nombrePieza
            );
        }
    }

    // ── LÍNEAS DE MANGA ──────────────────────────────────────
    // Cada línea se procesa independientemente según su valor en CSV
    // Si el valor está vacío o el grupo no existe → se omite sin error
    if (nombrePieza === "MANGA_IZQ" || nombrePieza === "MANGA_DER") {

        // Línea izquierda — ancho fijo, alto escala con la manga
        var lineaIzqAncho = parseFloat(jugador.MANGA_LINEA_IZQ_ANCHO);
        if (!isNaN(lineaIzqAncho) && lineaIzqAncho > 0) {
            procesarLineaManga(
                findItemByNameRecursivo(dinamico, "MANGA_LINEA_IZQ"),
                "IZQ", lineaIzqAncho, jugador.NOMBRE, nombrePieza, factorPieza
            );
        }

        // Línea derecha — ancho fijo, alto escala con la manga
        var lineaDerAncho = parseFloat(jugador.MANGA_LINEA_DER_ANCHO);
        if (!isNaN(lineaDerAncho) && lineaDerAncho > 0) {
            procesarLineaManga(
                findItemByNameRecursivo(dinamico, "MANGA_LINEA_DER"),
                "DER", lineaDerAncho, jugador.NOMBRE, nombrePieza, factorPieza
            );
        }

        // Línea inferior — alto fijo, ancho escala con la manga
        var lineaInfAlto = parseFloat(jugador.MANGA_LINEA_INF_ALTO);
        if (!isNaN(lineaInfAlto) && lineaInfAlto > 0) {
            procesarLineaMangaInf(
                findGroupByNameRecursivo(dinamico, "MANGA_LINEA_INF"),
                lineaInfAlto, jugador.NOMBRE, nombrePieza, factorPieza
            );
        }
    }
}

// ── Determina si una pieza lleva un elemento según el CSV ───
function llevaElemento(jugador, nombrePieza, elemento) {
    if (nombrePieza === "FRENTE") {
        if (elemento === "NOMBRE")    return jugador.LLEVA_NOMBRE_F    === "SI";
        if (elemento === "NUMERO")    return jugador.LLEVA_NUMERO_F    === "SI";
        if (elemento === "COSTILLA")  return jugador.LLEVA_COSTILLA_F  === "SI";
    }
    if (nombrePieza === "ESPALDA") {
        if (elemento === "NOMBRE")    return jugador.LLEVA_NOMBRE_E    === "SI";
        if (elemento === "NUMERO")    return jugador.LLEVA_NUMERO_E    === "SI";
        if (elemento === "COSTILLA")  return jugador.LLEVA_COSTILLA_E  === "SI";
    }
    if (nombrePieza === "MANGA_IZQ" || nombrePieza === "MANGA_DER") {
        if (elemento === "NOMBRE") return jugador.LLEVA_NOMBRE_E === "SI";
        if (elemento === "NUMERO") return jugador.LLEVA_NUMERO_M === "SI";
    }
    return false;
}

// ── Inicial de pieza para el log ────────────────────────────
function inicialPieza(nombrePieza) {
    if (nombrePieza === "FRENTE")    return "F";
    if (nombrePieza === "ESPALDA")   return "E";
    if (nombrePieza === "MANGA_IZQ") return "M";
    if (nombrePieza === "MANGA_DER") return "M";
    return "?";
}

// ============================================================
//  POSICIONAMIENTO DE ETIQUETA
// ============================================================

// Posiciona la etiqueta en el FRENTE según márgenes del CSV.
// La etiqueta NO escala — solo cambia su posición.
//
// ETIQUETA_MARGIN_INF → distancia desde el borde inferior de la pieza (cm)
// ETIQUETA_MARGIN_LAT → distancia desde el borde lateral más cercano (cm)
function posicionarEtiqueta(etiqueta, grupoPieza, marginInfCm, marginLatCm, lado, nombreJugador, nombrePieza) {
    try {
        // Usar ESTATICO como referencia de bordes reales de la camiseta
        var estatico    = findGroupByNameRecursivo(grupoPieza, "ESTATICO");
        var refBounds   = estatico ? estatico.geometricBounds
                                   : grupoPieza.geometricBounds;
        // geometricBounds = [left, top, right, bottom]
        // En AI: top es el valor más GRANDE (menos negativo), bottom el más pequeño
        var piezaLeft   = refBounds[0];
        var piezaTop    = refBounds[1];  // valor mayor (menos negativo = arriba)
        var piezaRight  = refBounds[2];
        var piezaBottom = refBounds[3];  // valor menor (más negativo = abajo)

        // Tamaño de la etiqueta — no escala
        var etqBounds = etiqueta.geometricBounds;
        var etqAncho  = Math.abs(etqBounds[2] - etqBounds[0]);
        var etqAlto   = Math.abs(etqBounds[1] - etqBounds[3]);

        // Convertir márgenes a puntos
        var marginInfPt = cmToPt(marginInfCm);
        var marginLatPt = cmToPt(marginLatCm);

        // Usar las costillas ya posicionadas como referencia
        var dinamicoPieza = findGroupByNameRecursivo(grupoPieza, "DINAMICO");
        var costillaIzq   = dinamicoPieza
                            ? findItemByNameRecursivo(dinamicoPieza, "COSTILLA_IZQ")
                            : null;
        var costillaDer   = dinamicoPieza
                            ? findItemByNameRecursivo(dinamicoPieza, "COSTILLA_DER")
                            : null;

        // Referencia lateral: borde EXTERNO de la costilla = borde del ESTATICO
        var refLeft  = costillaIzq
                       ? costillaIzq.geometricBounds[0]  // left de costilla IZQ
                       : piezaLeft;
        var refRight = costillaDer
                       ? costillaDer.geometricBounds[2]  // right de costilla DER
                       : piezaRight;

        // Referencia inferior: bottom de la costilla
        var refBottom = piezaBottom;
        if (costillaIzq) {
            var cIzqB = costillaIzq.geometricBounds;
            // bottom = top - alto (en AI, top es menos negativo que bottom)
            var cIzqBottom = cIzqB[1] - Math.abs(cIzqB[1] - cIzqB[3]);
            refBottom = cIzqBottom;
        } else if (costillaDer) {
            var cDerB = costillaDer.geometricBounds;
            var cDerBottom = cDerB[1] - Math.abs(cDerB[1] - cDerB[3]);
            refBottom = cDerBottom;
        }

        // Posición vertical: top etiqueta = refBottom + marginInf + etqAlto
        var nuevoTop = refBottom + marginInfPt + etqAlto;

        // Posición horizontal según lado
        var nuevoLeft;
        if (lado === "IZQ") {
            nuevoLeft = refLeft + marginLatPt;
        } else {
            nuevoLeft = refRight - marginLatPt - etqAncho;
        }

        etiqueta.left = nuevoLeft;
        etiqueta.top  = nuevoTop;

        Log.ok(nombrePieza + " | " + nombreJugador +
               ": ETIQUETA posicionada (inf:" +
               marginInfCm.toFixed(1) + "cm, lat:" +
               marginLatCm.toFixed(1) + "cm, lado:" + lado + ")");

    } catch(e) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": ETIQUETA error al posicionar (" + e.message + ") — omitida");
    }
}

// ============================================================
//  PROCESAMIENTO DE LÍNEAS DE MANGA
// ============================================================

// Líneas laterales (IZQ y DER): ancho fijo del CSV, alto escala con la manga
function procesarLineaManga(item, lado, targetAnchoCmd, nombreJugador, nombrePieza, factorPieza) {
    if (!item) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": MANGA_LINEA_" + lado + " no encontrada — omitida");
        return;
    }

    try {
        var boundsAntes = item.geometricBounds;
        var leftAntes   = boundsAntes[0];
        var rightAntes  = boundsAntes[2];
        var topAntes    = boundsAntes[1];

        var anchoRealCm = ptToCm(Math.abs(rightAntes - leftAntes));
        if (anchoRealCm <= 0) return;
        var factorAncho = (targetAnchoCmd / anchoRealCm) * 100;

        // resize() funciona tanto para GroupItem como RasterItem
        item.resize(
            factorAncho, 100,
            true, true, true, true, 100,
            Transformation.TOPLEFT
        );

        // Restaurar posición según lado
        var boundsDespues = item.geometricBounds;
        var nuevoAncho    = Math.abs(boundsDespues[2] - boundsDespues[0]);

        if (lado === "IZQ") {
            item.left = leftAntes;
        } else {
            item.left = rightAntes - nuevoAncho;
        }
        item.top = topAntes;

        Log.ok(nombrePieza + " | " + nombreJugador +
               ": MANGA_LINEA_" + lado + " → " + targetAnchoCmd.toFixed(1) + "cm");

    } catch(e) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": MANGA_LINEA_" + lado + " error (" + e.message + ") — omitida");
    }
}

// Línea inferior: alto fijo del CSV, ancho escala con la manga
function procesarLineaMangaInf(grupoLinea, targetAltoCmd, nombreJugador, nombrePieza, factorPieza) {
    if (!grupoLinea) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": MANGA_LINEA_INF no encontrada — omitida");
        return;
    }

    try {
        var boundsAntes = grupoLinea.geometricBounds;
        var leftAntes   = boundsAntes[0];
        var bottomAntes = boundsAntes[3];  // borde inferior (valor negativo en AI)
        var altoActPt   = Math.abs(boundsAntes[1] - boundsAntes[3]);
        if (altoActPt <= 0) return;

        // Usar factor Y (alto) — la línea inferior depende del alto de la manga
        var altoActualReal = CONFIG.lineaMangaBase.inf_alto * factorPieza.y;
        var factorAlto     = (targetAltoCmd / altoActualReal) * 100;

        // Resize solo en Y — ancho no se toca
        grupoLinea.resize(
            100, factorAlto,
            true, true, true, true, 100,
            Transformation.BOTTOMLEFT  // anclar desde abajo para que suba hacia arriba
        );

        // Restaurar posición: left fijo, bottom fijo (pegada al borde inferior)
        var boundsDespues = grupoLinea.geometricBounds;
        var nuevoAlto     = Math.abs(boundsDespues[1] - boundsDespues[3]);

        grupoLinea.left = leftAntes;
        // Anclar borde inferior: top = bottomAntes + nuevoAlto
        grupoLinea.top  = bottomAntes + nuevoAlto;

        Log.ok(nombrePieza + " | " + nombreJugador +
               ": MANGA_LINEA_INF → " + targetAltoCmd.toFixed(1) + "cm");

    } catch(e) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": MANGA_LINEA_INF error (" + e.message + ") — omitida");
    }
}

// ============================================================
//  PROCESAMIENTO DE COSTILLAS
// ============================================================

// Procesa una costilla (IZQ o DER):
//   1. Corrige SOLO el ancho al valor del CSV (el alto ya quedó bien del scaleGroupExact)
//   2. La posiciona pegada al borde izquierdo o derecho de la pieza
function procesarCostilla(grupoCostilla, lado, targetAnchoCmd, grupoPieza, nombreJugador, nombrePieza) {
    // Si no existe el grupo en el .ai → omitir sin error
    if (!grupoCostilla) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": COSTILLA_" + lado + " no encontrada en DINAMICO — omitida");
        return;
    }

    try {
        // ── 1. Guardar posición ANTES del resize ─────────────
        var boundsAntes  = grupoCostilla.geometricBounds;
        var leftAntes    = boundsAntes[0];   // borde izquierdo
        var rightAntes   = boundsAntes[2];   // borde derecho
        var topAntes     = boundsAntes[1];   // posición vertical
        var anchoActPt   = Math.abs(rightAntes - leftAntes);
        if (anchoActPt <= 0) return;

        var anchoActCm  = ptToCm(anchoActPt);
        var factorAncho = (targetAnchoCmd / anchoActCm) * 100;

        // ── 2. Resize SOLO en X desde TOPLEFT ────────────────
        grupoCostilla.resize(
            factorAncho, 100,
            true, true, true, true, 100,
            Transformation.TOPLEFT
        );

        // ── 3. Restaurar posición según lado ─────────────────
        // TOPLEFT ancla el resize desde la esquina superior-izquierda,
        // así que el left no cambia pero el right sí.
        // Para DER necesitamos que el right quede donde estaba.
        var boundsDespues = grupoCostilla.geometricBounds;
        var nuevoAncho    = Math.abs(boundsDespues[2] - boundsDespues[0]);

        if (lado === "IZQ") {
            // Left fijo — la costilla crece hacia adentro (derecha)
            grupoCostilla.left = leftAntes;
        } else {
            // Right fijo — la costilla crece hacia adentro (izquierda)
            grupoCostilla.left = rightAntes - nuevoAncho;
        }
        grupoCostilla.top = topAntes;

        Log.ok(nombrePieza + " | " + nombreJugador +
               ": COSTILLA_" + lado + " → " + targetAnchoCmd.toFixed(1) + "cm");

    } catch(e) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": COSTILLA_" + lado + " error (" + e.message + ") — omitida");
    }
}

// ============================================================
//  CENTRADO HORIZONTAL DE TEXTO
// ============================================================

// Centra un TextFrame horizontalmente respecto a su pieza contenedora.
// Mantiene la posición vertical intacta.
function centrarHorizontalmente(textFrame, grupoPieza) {
    try {
        // Centro horizontal de la pieza completa
        var piezaBounds  = grupoPieza.geometricBounds;
        // geometricBounds = [left, top, right, bottom]
        var piezaLeft    = piezaBounds[0];
        var piezaRight   = piezaBounds[2];
        var piezaCentroX = (piezaLeft + piezaRight) / 2;

        // Forzar alineación centrada en el párrafo del TextFrame
        try {
            var parrafo = textFrame.textRange.paragraphAttributes;
            parrafo.justification = Justification.CENTER;
        } catch(e) { /* ignorar si no es accesible */ }

        // Obtener ancho actual del TextFrame después de cambiar el contenido
        var tfBounds = textFrame.visibleBounds;
        var tfAncho  = Math.abs(tfBounds[2] - tfBounds[0]);

        // Calcular nueva posición left para centrar
        var nuevoLeft = piezaCentroX - (tfAncho / 2);

        // Aplicar solo la posición horizontal, mantener vertical intacta
        textFrame.left = nuevoLeft;

    } catch(e) {
        // Si falla el centrado, no interrumpir el proceso
        // El texto queda en su posición original
    }
}
