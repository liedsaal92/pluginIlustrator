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
                }
                // Escalar según REF del CSV
                var sufNombre = (nombrePieza === "ESPALDA") ? "_E" : "_F";
                escalarConRef(
                    itemNombre,
                    jugador["NOMBRE" + sufNombre + "_ANCHO"],
                    jugador["NOMBRE" + sufNombre + "_ALTO"],
                    jugador["NOMBRE" + sufNombre + "_REF"],
                    nombrePieza + " | " + jugador.NOMBRE + ": NOMBRE"
                );
                centrarHorizontalmente(itemNombre, grupoCopia);
            }
        }
    }

    // ── NUMERO ──────────────────────────────────────────────
    // Item genérico llamado "NUMERO" — usado principalmente en MANGA
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
            if (jugador.NUMERO === "" || isNaN(parseFloat(jugador.NUMERO))) {
                Log.error(
                    nombrePieza + " | " + jugador.NOMBRE +
                    ": TIENE_NUMERO=SI pero NUMERO está vacío"
                );
                itemNumero.hidden = true;
            } else {
                if (itemNumero.typename === "TextFrame") {
                    itemNumero.contents = String(parseInt(jugador.NUMERO));
                    centrarHorizontalmente(itemNumero, grupoCopia);
                }
                // Escalar — para MANGA usa NUMERO_M_*, para otras piezas sin item dedicado
                if (nombrePieza === "MANGA_IZQ" || nombrePieza === "MANGA_DER") {
                    escalarConRef(
                        itemNumero,
                        jugador.NUMERO_M_ANCHO,
                        jugador.NUMERO_M_ALTO,
                        jugador.NUMERO_M_REF,
                        nombrePieza + " | " + jugador.NOMBRE + ": NUMERO"
                    );
                }
            }
        }
    }

    // ── ESCUDO ──────────────────────────────────────────────
    // Item genérico ESCUDO en piezas FRENTE o ESPALDA
    var grupoEscudo = findGroupByNameRecursivo(dinamico, CONFIG.itemEscudo);

    if (grupoEscudo) {
        var sufEscudo    = (nombrePieza === "ESPALDA") ? "_E" : "_F";
        var llevaEscudo  = (nombrePieza === "ESPALDA") ? jugador.LLEVA_ESCUDO_E : jugador.LLEVA_ESCUDO_F;
        if (llevaEscudo !== "SI") {
            grupoEscudo.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": ESCUDO ocultado (LLEVA=NO)");
        } else {
            escalarConRef(
                grupoEscudo,
                jugador["ESCUDO" + sufEscudo + "_ANCHO"],
                jugador["ESCUDO" + sufEscudo + "_ALTO"],
                jugador["ESCUDO" + sufEscudo + "_REF"],
                nombrePieza + " | " + jugador.NOMBRE + ": ESCUDO"
            );
        }
    }

    // ── ESCUDO_CENTRAL ──────────────────────────────────────
    var grupoEscudoCentral = findGroupByNameRecursivo(dinamico, "ESCUDO_CENTRAL");

    if (grupoEscudoCentral) {
        if (jugador.LLEVA_ESCUDO_CENTRAL !== "SI") {
            grupoEscudoCentral.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": ESCUDO_CENTRAL ocultado (LLEVA=NO)");
        } else {
            escalarConRef(
                grupoEscudoCentral,
                jugador.ESCUDO_CENTRAL_ANCHO,
                jugador.ESCUDO_CENTRAL_ALTO,
                jugador.ESCUDO_CENTRAL_REF,
                nombrePieza + " | " + jugador.NOMBRE + ": ESCUDO_CENTRAL"
            );
        }
    }

    // ── NUMERO_FRENTE ────────────────────────────────────────
    var itemNumeroFrente = findItemByNameRecursivo(dinamico, "NUMERO_FRENTE");

    if (itemNumeroFrente) {
        if (jugador.TIENE_NUMERO === "NO" || !llevaNumeroEnEstaPieza) {
            itemNumeroFrente.hidden = true;
        } else if (jugador.NUMERO !== "" && !isNaN(parseFloat(jugador.NUMERO))) {
            var tfNumeroFrente = (itemNumeroFrente.typename === "TextFrame")
                                 ? itemNumeroFrente
                                 : findTextFrameRecursivo(itemNumeroFrente);
            if (tfNumeroFrente) {
                tfNumeroFrente.contents = String(parseInt(jugador.NUMERO));
                centrarHorizontalmente(itemNumeroFrente, grupoCopia);
            }
        }
        escalarConRef(
            itemNumeroFrente,
            jugador.NUMERO_FRENTE_ANCHO,
            jugador.NUMERO_FRENTE_ALTO,
            jugador.NUMERO_FRENTE_REF,
            nombrePieza + " | " + jugador.NOMBRE + ": NUMERO_FRENTE"
        );
    }

    // ── NUMERO_ESPALDA ───────────────────────────────────────
    var itemNumeroEspalda = findItemByNameRecursivo(dinamico, "NUMERO_ESPALDA");

    if (itemNumeroEspalda) {
        if (jugador.TIENE_NUMERO === "NO" || !llevaNumeroEnEstaPieza) {
            itemNumeroEspalda.hidden = true;
        } else if (jugador.NUMERO !== "" && !isNaN(parseFloat(jugador.NUMERO))) {
            var tfNumeroEspalda = (itemNumeroEspalda.typename === "TextFrame")
                                  ? itemNumeroEspalda
                                  : findTextFrameRecursivo(itemNumeroEspalda);
            if (tfNumeroEspalda) {
                tfNumeroEspalda.contents = String(parseInt(jugador.NUMERO));
                centrarHorizontalmente(itemNumeroEspalda, grupoCopia);
            }
        }
        escalarConRef(
            itemNumeroEspalda,
            jugador.NUMERO_ESPALDA_ANCHO,
            jugador.NUMERO_ESPALDA_ALTO,
            jugador.NUMERO_ESPALDA_REF,
            nombrePieza + " | " + jugador.NOMBRE + ": NUMERO_ESPALDA"
        );
    }

    // ── SPONSOR_TOP_IZQ ─────────────────────────────────────
    var itemSponsorTopIzq = findItemByNameRecursivo(dinamico, "SPONSOR_TOP_IZQ");

    if (itemSponsorTopIzq) {
        if (jugador.LLEVA_SPONSOR_TOP_IZQ !== "SI") {
            itemSponsorTopIzq.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": SPONSOR_TOP_IZQ ocultado (LLEVA=NO)");
        } else {
            escalarConRef(
                itemSponsorTopIzq,
                jugador.SPONSOR_TOP_IZQ_ANCHO,
                jugador.SPONSOR_TOP_IZQ_ALTO,
                jugador.SPONSOR_TOP_IZQ_REF,
                nombrePieza + " | " + jugador.NOMBRE + ": SPONSOR_TOP_IZQ"
            );
        }
    }

    // ── SPONSOR_TOP_DER ─────────────────────────────────────
    var itemSponsorTopDer = findItemByNameRecursivo(dinamico, "SPONSOR_TOP_DER");

    if (itemSponsorTopDer) {
        if (jugador.LLEVA_SPONSOR_TOP_DER !== "SI") {
            itemSponsorTopDer.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": SPONSOR_TOP_DER ocultado (LLEVA=NO)");
        } else {
            escalarConRef(
                itemSponsorTopDer,
                jugador.SPONSOR_TOP_DER_ANCHO,
                jugador.SPONSOR_TOP_DER_ALTO,
                jugador.SPONSOR_TOP_DER_REF,
                nombrePieza + " | " + jugador.NOMBRE + ": SPONSOR_TOP_DER"
            );
        }
    }

    // ── ESCUDO + SPONSOR_SECUNDARIO en MANGA ─────────────────
    if (nombrePieza === "MANGA_IZQ" || nombrePieza === "MANGA_DER") {
        var grupoEscudoManga           = findGroupByNameRecursivo(dinamico, CONFIG.itemEscudo);
        var itemSponsorSecundarioManga = findItemByNameRecursivo(dinamico, "SPONSOR_SECUNDARIO");

        // 1. Escalar SPONSOR_SECUNDARIO
        if (itemSponsorSecundarioManga) {
            if (jugador.LLEVA_SPONSOR_SECUNDARIO_M !== "SI") {
                itemSponsorSecundarioManga.hidden = true;
                Log.info(nombrePieza + " | " + jugador.NOMBRE + ": SPONSOR_SECUNDARIO (manga) ocultado (LLEVA=NO)");
                itemSponsorSecundarioManga = null; // evitar que el posicionado lo use
            } else {
                escalarConRef(
                    itemSponsorSecundarioManga,
                    jugador.SPONSOR_SECUNDARIO_M_ANCHO,
                    jugador.SPONSOR_SECUNDARIO_M_ALTO,
                    jugador.SPONSOR_SECUNDARIO_M_REF,
                    nombrePieza + " | " + jugador.NOMBRE + ": SPONSOR_SECUNDARIO (manga)"
                );
            }
        }

        // 2. Escalar ESCUDO
        if (grupoEscudoManga) {
            if (jugador.LLEVA_ESCUDO_M !== "SI") {
                grupoEscudoManga.hidden = true;
                Log.info(nombrePieza + " | " + jugador.NOMBRE + ": ESCUDO (manga) ocultado (LLEVA=NO)");
                grupoEscudoManga = null; // evitar que el posicionado lo use
            } else {
                escalarConRef(
                    grupoEscudoManga,
                    jugador.ESCUDO_M_ANCHO,
                    jugador.ESCUDO_M_ALTO,
                    jugador.ESCUDO_M_REF,
                    nombrePieza + " | " + jugador.NOMBRE + ": ESCUDO (manga)"
                );
            }
        }

        // 3. Posicionar verticalmente y centrar horizontalmente
        var mangaMarginInf    = parseFloat(jugador.MANGA_MARGIN_INF);
        var mangaMarginEscudo = parseFloat(jugador.MANGA_MARGIN_ESCUDO);
        var estaticManga      = findGroupByNameRecursivo(grupoCopia, "ESTATICO");
        var mangaBounds       = estaticManga ? estaticManga.geometricBounds : grupoCopia.geometricBounds;
        var mangaBottom       = mangaBounds[3];
        var mangaLeft         = mangaBounds[0];
        var mangaRight        = mangaBounds[2];
        var mangaCentroX      = (mangaLeft + mangaRight) / 2;

        if (!isNaN(mangaMarginInf) && mangaMarginInf >= 0) {

            if (itemSponsorSecundarioManga) {
                var ssmBounds = itemSponsorSecundarioManga.geometricBounds;
                var ssmAltura = Math.abs(ssmBounds[1] - ssmBounds[3]);
                var ssmAncho2 = Math.abs(ssmBounds[2] - ssmBounds[0]);

                itemSponsorSecundarioManga.top  = mangaBottom + cmToPt(mangaMarginInf) + ssmAltura;
                itemSponsorSecundarioManga.left = mangaCentroX - (ssmAncho2 / 2);

                Log.ok(nombrePieza + " | " + jugador.NOMBRE +
                       ": SPONSOR_SECUNDARIO (manga) posicionado (inf:" + mangaMarginInf.toFixed(1) + "cm)");
            }

            if (grupoEscudoManga) {
                var escBounds  = grupoEscudoManga.geometricBounds;
                var escAltura  = Math.abs(escBounds[1] - escBounds[3]);
                var escAncho2  = Math.abs(escBounds[2] - escBounds[0]);
                var escNuevoLeft = mangaCentroX - (escAncho2 / 2);

                if (itemSponsorSecundarioManga && !isNaN(mangaMarginEscudo) && mangaMarginEscudo >= 0) {
                    var ssmTopActual = itemSponsorSecundarioManga.geometricBounds[1];
                    grupoEscudoManga.top  = ssmTopActual + escAltura + cmToPt(mangaMarginEscudo);
                    Log.ok(nombrePieza + " | " + jugador.NOMBRE +
                           ": ESCUDO (manga) posicionado sobre sponsor (sep:" + mangaMarginEscudo.toFixed(1) + "cm)");
                } else {
                    grupoEscudoManga.top  = mangaBottom + cmToPt(mangaMarginInf) + escAltura;
                    Log.ok(nombrePieza + " | " + jugador.NOMBRE +
                           ": ESCUDO (manga) posicionado desde borde (sin sponsor)");
                }
                grupoEscudoManga.left = escNuevoLeft;
            }
        }
    }

    // ── SPONSOR_PRINCIPAL ────────────────────────────────────
    var itemSponsorPrincipal = findItemByNameRecursivo(dinamico, "SPONSOR_PRINCIPAL");

    if (itemSponsorPrincipal) {
        var spSufijo    = (nombrePieza === "ESPALDA") ? "_E" : "_F";
        var llevaSP     = (nombrePieza === "ESPALDA") ? jugador.LLEVA_SPONSOR_PRINCIPAL_E : jugador.LLEVA_SPONSOR_PRINCIPAL_F;
        if (llevaSP !== "SI") {
            itemSponsorPrincipal.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": SPONSOR_PRINCIPAL ocultado (LLEVA=NO)");
        } else {
            escalarConRef(
                itemSponsorPrincipal,
                jugador["SPONSOR_PRINCIPAL" + spSufijo + "_ANCHO"],
                jugador["SPONSOR_PRINCIPAL" + spSufijo + "_ALTO"],
                jugador["SPONSOR_PRINCIPAL" + spSufijo + "_REF"],
                nombrePieza + " | " + jugador.NOMBRE + ": SPONSOR_PRINCIPAL"
            );
        }
    }

    // ── SPONSOR_SECUNDARIO (frente / espalda) ────────────────
    var itemSponsorSecundario = (nombrePieza !== "MANGA_IZQ" && nombrePieza !== "MANGA_DER")
                                ? findItemByNameRecursivo(dinamico, "SPONSOR_SECUNDARIO")
                                : null;

    if (itemSponsorSecundario) {
        var ssSufijo  = (nombrePieza === "ESPALDA") ? "_E" : "_F";
        var llevaSS   = (nombrePieza === "ESPALDA") ? jugador.LLEVA_SPONSOR_SECUNDARIO_E : jugador.LLEVA_SPONSOR_SECUNDARIO_F;
        if (llevaSS !== "SI") {
            itemSponsorSecundario.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": SPONSOR_SECUNDARIO ocultado (LLEVA=NO)");
        } else {
            escalarConRef(
                itemSponsorSecundario,
                jugador["SPONSOR_SECUNDARIO" + ssSufijo + "_ANCHO"],
                jugador["SPONSOR_SECUNDARIO" + ssSufijo + "_ALTO"],
                jugador["SPONSOR_SECUNDARIO" + ssSufijo + "_REF"],
                nombrePieza + " | " + jugador.NOMBRE + ": SPONSOR_SECUNDARIO"
            );
        }
    }

    // ── ETIQUETA_TOP ─────────────────────────────────────────
    var itemEtiquetaTop = findItemByNameRecursivo(dinamico, "ETIQUETA_TOP");

    if (itemEtiquetaTop) {
        if (jugador.LLEVA_ETIQUETA_TOP !== "SI") {
            itemEtiquetaTop.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": ETIQUETA_TOP ocultada (LLEVA=NO)");
        } else {
            escalarConRef(
                itemEtiquetaTop,
                jugador.ETIQUETA_TOP_ANCHO,
                jugador.ETIQUETA_TOP_ALTO,
                jugador.ETIQUETA_TOP_REF,
                nombrePieza + " | " + jugador.NOMBRE + ": ETIQUETA_TOP"
            );
            var etqTopMarginSup = parseFloat(jugador.ETIQUETA_TOP_MARGIN_SUP);
            if (!isNaN(etqTopMarginSup) && etqTopMarginSup >= 0) {
                posicionarEtiquetaTop(
                    itemEtiquetaTop, grupoCopia,
                    etqTopMarginSup,
                    jugador.NOMBRE, nombrePieza
                );
            }
        }
    }

    // ── LOGO_MARCA ───────────────────────────────────────────
    var itemLogoMarca = findItemByNameRecursivo(dinamico, "LOGO_MARCA");

    if (itemLogoMarca) {
        if (jugador.LLEVA_LOGO_MARCA !== "SI") {
            itemLogoMarca.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": LOGO_MARCA ocultado (LLEVA=NO)");
        } else {
            escalarConRef(
                itemLogoMarca,
                jugador.LOGO_MARCA_ANCHO,
                jugador.LOGO_MARCA_ALTO,
                jugador.LOGO_MARCA_REF,
                nombrePieza + " | " + jugador.NOMBRE + ": LOGO_MARCA"
            );
        }
    }

    // ── COSTILLAS ────────────────────────────────────────────
    if (llevaElemento(jugador, nombrePieza, "COSTILLA")) {
        var sufCostilla   = (nombrePieza === "ESPALDA") ? "_E" : "_F";
        var costillaRef   = trim((jugador["COSTILLA" + sufCostilla + "_REF"] || "") + "").toUpperCase();
        var costillaAncho = parseFloat(jugador["COSTILLA" + sufCostilla + "_ANCHO"]);
        var costillaAlto  = parseFloat(jugador["COSTILLA" + sufCostilla + "_ALTO"]);

        procesarCostilla(
            findItemByNameRecursivo(dinamico, "COSTILLA_IZQ"),
            "IZQ", costillaAncho, costillaAlto, costillaRef, grupoCopia, jugador.NOMBRE, nombrePieza
        );
        procesarCostilla(
            findItemByNameRecursivo(dinamico, "COSTILLA_DER"),
            "DER", costillaAncho, costillaAlto, costillaRef, grupoCopia, jugador.NOMBRE, nombrePieza
        );
    }

    // ── ETIQUETA_PRINCIPAL / ETIQUETA_SECUNDARIA ─────────────
    if (nombrePieza === "FRENTE" || nombrePieza === "ESPALDA") {
        var sufEtq = (nombrePieza === "ESPALDA") ? "_E" : "_F";

        // — ETIQUETA_PRINCIPAL —
        var epMarginInf = parseFloat(jugador["ETIQUETA_PRINCIPAL" + sufEtq + "_MARGIN_INF"]);
        var epMarginLat = parseFloat(jugador["ETIQUETA_PRINCIPAL" + sufEtq + "_MARGIN_LAT"]);
        var epLado      = trim((jugador["ETIQUETA_PRINCIPAL" + sufEtq + "_LADO"] || "DER") + "").toUpperCase();
        var grupoEtqPrincipal = findItemByNameRecursivo(dinamico, "ETIQUETA_PRINCIPAL");

        if (grupoEtqPrincipal) {
            if (jugador["LLEVA_ETIQUETA_PRINCIPAL" + sufEtq] !== "SI") {
                grupoEtqPrincipal.hidden = true;
                Log.info(nombrePieza + " | " + jugador.NOMBRE + ": ETIQUETA_PRINCIPAL ocultada (LLEVA=NO)");
            } else {
                escalarConRef(
                    grupoEtqPrincipal,
                    jugador["ETIQUETA_PRINCIPAL" + sufEtq + "_ANCHO"],
                    jugador["ETIQUETA_PRINCIPAL" + sufEtq + "_ALTO"],
                    jugador["ETIQUETA_PRINCIPAL" + sufEtq + "_REF"],
                    nombrePieza + " | " + jugador.NOMBRE + ": ETIQUETA_PRINCIPAL"
                );
                if (!isNaN(epMarginInf) && epMarginInf >= 0 &&
                    !isNaN(epMarginLat) && epMarginLat >= 0) {
                    posicionarEtiqueta(
                        grupoEtqPrincipal, grupoCopia,
                        epMarginInf, epMarginLat, epLado,
                        jugador.NOMBRE, nombrePieza, "ETIQUETA_PRINCIPAL"
                    );
                }
            }
        }

        // — ETIQUETA_SECUNDARIA —
        var esMarginInf = parseFloat(jugador["ETIQUETA_SECUNDARIA" + sufEtq + "_MARGIN_INF"]);
        var esMarginLat = parseFloat(jugador["ETIQUETA_SECUNDARIA" + sufEtq + "_MARGIN_LAT"]);
        var esLado      = trim((jugador["ETIQUETA_SECUNDARIA" + sufEtq + "_LADO"] || "DER") + "").toUpperCase();
        var grupoEtqSecundaria = findItemByNameRecursivo(dinamico, "ETIQUETA_SECUNDARIA");

        if (grupoEtqSecundaria) {
            if (jugador["LLEVA_ETIQUETA_SECUNDARIA" + sufEtq] !== "SI") {
                grupoEtqSecundaria.hidden = true;
                Log.info(nombrePieza + " | " + jugador.NOMBRE + ": ETIQUETA_SECUNDARIA ocultada (LLEVA=NO)");
            } else {
                escalarConRef(
                    grupoEtqSecundaria,
                    jugador["ETIQUETA_SECUNDARIA" + sufEtq + "_ANCHO"],
                    jugador["ETIQUETA_SECUNDARIA" + sufEtq + "_ALTO"],
                    jugador["ETIQUETA_SECUNDARIA" + sufEtq + "_REF"],
                    nombrePieza + " | " + jugador.NOMBRE + ": ETIQUETA_SECUNDARIA"
                );
                if (!isNaN(esMarginInf) && esMarginInf >= 0 &&
                    !isNaN(esMarginLat) && esMarginLat >= 0) {
                    posicionarEtiqueta(
                        grupoEtqSecundaria, grupoCopia,
                        esMarginInf, esMarginLat, esLado,
                        jugador.NOMBRE, nombrePieza, "ETIQUETA_SECUNDARIA"
                    );
                }
            }
        }
    }

    // ── LÍNEAS DE MANGA ──────────────────────────────────────
    if (nombrePieza === "MANGA_IZQ" || nombrePieza === "MANGA_DER") {

        var itemLineaIzq = findItemByNameRecursivo(dinamico, "MANGA_LINEA_IZQ");
        if (itemLineaIzq && jugador.LLEVA_MANGA_LINEA_IZQ !== "SI") {
            itemLineaIzq.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": MANGA_LINEA_IZQ ocultada (LLEVA=NO)");
        } else {
            var lineaIzqAncho = parseFloat(jugador.MANGA_LINEA_IZQ_ANCHO);
            var lineaIzqAlto  = parseFloat(jugador.MANGA_LINEA_IZQ_ALTO);
            var lineaIzqRef   = trim((jugador.MANGA_LINEA_IZQ_REF || "") + "").toUpperCase();
            procesarLineaManga(itemLineaIzq, "IZQ", lineaIzqAncho, lineaIzqAlto, lineaIzqRef,
                               jugador.NOMBRE, nombrePieza, factorPieza);
        }

        var itemLineaDer = findItemByNameRecursivo(dinamico, "MANGA_LINEA_DER");
        if (itemLineaDer && jugador.LLEVA_MANGA_LINEA_DER !== "SI") {
            itemLineaDer.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": MANGA_LINEA_DER ocultada (LLEVA=NO)");
        } else {
            var lineaDerAncho = parseFloat(jugador.MANGA_LINEA_DER_ANCHO);
            var lineaDerAlto  = parseFloat(jugador.MANGA_LINEA_DER_ALTO);
            var lineaDerRef   = trim((jugador.MANGA_LINEA_DER_REF || "") + "").toUpperCase();
            procesarLineaManga(itemLineaDer, "DER", lineaDerAncho, lineaDerAlto, lineaDerRef,
                               jugador.NOMBRE, nombrePieza, factorPieza);
        }

        var grupoLineaInf = findGroupByNameRecursivo(dinamico, "MANGA_LINEA_INF");
        if (grupoLineaInf && jugador.LLEVA_MANGA_LINEA_INF !== "SI") {
            grupoLineaInf.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": MANGA_LINEA_INF ocultada (LLEVA=NO)");
        } else {
            var lineaInfAncho = parseFloat(jugador.MANGA_LINEA_INF_ANCHO);
            var lineaInfAlto  = parseFloat(jugador.MANGA_LINEA_INF_ALTO);
            var lineaInfRef   = trim((jugador.MANGA_LINEA_INF_REF || "") + "").toUpperCase();
            procesarLineaMangaInf(grupoLineaInf, lineaInfAncho, lineaInfAlto, lineaInfRef,
                                  jugador.NOMBRE, nombrePieza, factorPieza);
        }
    }
}

// ── Helper: escalar un item usando la lógica ANCHO / ALTO / PROPORCIONAL ──
// PROPORCIONAL = no hacer nada extra (el item ya escaló con la pieza en scaleGroupExact)
function escalarConRef(item, ancho, alto, ref, logPrefijo) {
    var r = trim((ref || "") + "").toUpperCase();
    var a = parseFloat(ancho);
    var h = parseFloat(alto);

    if (r === "ANCHO" && !isNaN(a) && a > 0) {
        escalarItemDesdecentro(item, a, "ANCHO");
        Log.ok(logPrefijo + " → ancho " + a.toFixed(1) + "cm");
    } else if (r === "ALTO" && !isNaN(h) && h > 0) {
        escalarItemDesdecentro(item, h, "ALTO");
        Log.ok(logPrefijo + " → alto " + h.toFixed(1) + "cm");
    } else if (r === "PROPORCIONAL") {
        Log.ok(logPrefijo + " → proporcional (escala con pieza)");
    } else {
        Log.info(logPrefijo + " sin valores válidos en CSV — no escalado");
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

function posicionarEtiquetaTop(etiqueta, grupoPieza, marginSupCm, nombreJugador, nombrePieza) {
    try {
        var estatico  = findGroupByNameRecursivo(grupoPieza, "ESTATICO");
        var refBounds = estatico ? estatico.geometricBounds
                                 : grupoPieza.geometricBounds;
        var piezaTop  = refBounds[1]; // borde superior del ESTATICO (coordenada Y en pts, positivo hacia arriba)

        var etqBounds = etiqueta.geometricBounds;
        var etqAlto   = Math.abs(etqBounds[1] - etqBounds[3]);

        var marginSupPt = cmToPt(marginSupCm);

        // En Illustrator top = borde superior del objeto; Y crece hacia arriba,
        // así que para bajar desde piezaTop sumamos el margen y el alto del objeto.
        etiqueta.top = piezaTop - marginSupPt;

        Log.ok(nombrePieza + " | " + nombreJugador +
               ": ETIQUETA_TOP posicionada (sup:" + marginSupCm.toFixed(1) + "cm)");

    } catch(e) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": ETIQUETA_TOP error al posicionar (" + e.message + ") — omitida");
    }
}

function posicionarEtiqueta(etiqueta, grupoPieza, marginInfCm, marginLatCm, lado, nombreJugador, nombrePieza, labelEtiqueta) {
    try {
        var estatico    = findGroupByNameRecursivo(grupoPieza, "ESTATICO");
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

// ============================================================
//  PROCESAMIENTO DE LÍNEAS DE MANGA
// ============================================================

// Líneas laterales (IZQ y DER)
// REF=ANCHO → fija el ancho al valor del CSV, alto escala con la manga (comportamiento original)
// REF=ALTO  → fija el alto al valor del CSV, ancho escala con la manga
// REF=PROPORCIONAL → escala con la pieza (no se aplica resize adicional)
function procesarLineaManga(item, lado, targetAncho, targetAlto, ref, nombreJugador, nombrePieza, factorPieza) {
    if (!item) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": MANGA_LINEA_" + lado + " no encontrada — omitida");
        return;
    }

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
        var botAntes    = boundsAntes[3];

        if (ref === "ANCHO" && !isNaN(targetAncho) && targetAncho > 0) {
            var anchoRealCm = ptToCm(Math.abs(rightAntes - leftAntes));
            if (anchoRealCm <= 0) return;
            var factorAncho = (targetAncho / anchoRealCm) * 100;

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

            item.resize(100, factorAlto, true, true, true, true, 100, Transformation.TOPLEFT);
            item.left = boundsAntes[0];
            item.top  = topAntes;

            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": MANGA_LINEA_" + lado + " → alto " + targetAlto.toFixed(1) + "cm");

        } else {
            Log.info(nombrePieza + " | " + nombreJugador +
                     ": MANGA_LINEA_" + lado + " sin valores válidos en CSV — no escalada");
        }

    } catch(e) {
        Log.info(nombrePieza + " | " + nombreJugador +
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
            var altoActualReal = CONFIG.lineaMangaBase.inf_alto * factorPieza.y;
            var factorAlto     = (targetAlto / altoActualReal) * 100;

            grupoLinea.resize(100, factorAlto, true, true, true, true, 100, Transformation.BOTTOMLEFT);

            var boundsDespues = grupoLinea.geometricBounds;
            var nuevoAlto     = Math.abs(boundsDespues[1] - boundsDespues[3]);
            grupoLinea.left = leftAntes;
            grupoLinea.top  = bottomAntes + nuevoAlto;

            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": MANGA_LINEA_INF → alto " + targetAlto.toFixed(1) + "cm");

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

    if (ref === "PROPORCIONAL") {
        Log.ok(nombrePieza + " | " + nombreJugador +
               ": COSTILLA_" + lado + " → proporcional (escala con pieza)");
        return;
    }

    try {
        var boundsAntes  = grupoCostilla.geometricBounds;
        var leftAntes    = boundsAntes[0];
        var rightAntes   = boundsAntes[2];
        var topAntes     = boundsAntes[1];

        if (ref === "ANCHO" && !isNaN(targetAncho) && targetAncho > 0) {
            var anchoActCm  = ptToCm(Math.abs(rightAntes - leftAntes));
            if (anchoActCm <= 0) return;
            var factorAncho = (targetAncho / anchoActCm) * 100;

            grupoCostilla.resize(factorAncho, 100, true, true, true, true, 100, Transformation.TOPLEFT);

            var boundsDespues = grupoCostilla.geometricBounds;
            var nuevoAncho    = Math.abs(boundsDespues[2] - boundsDespues[0]);
            grupoCostilla.left = (lado === "IZQ") ? leftAntes : rightAntes - nuevoAncho;
            grupoCostilla.top  = topAntes;

            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": COSTILLA_" + lado + " → ancho " + targetAncho.toFixed(1) + "cm");

        } else if (ref === "ALTO" && !isNaN(targetAlto) && targetAlto > 0) {
            var altoActCm  = ptToCm(Math.abs(boundsAntes[1] - boundsAntes[3]));
            if (altoActCm <= 0) return;
            var factorAlto = (targetAlto / altoActCm) * 100;

            grupoCostilla.resize(100, factorAlto, true, true, true, true, 100, Transformation.TOPLEFT);
            grupoCostilla.left = boundsAntes[0];
            grupoCostilla.top  = topAntes;

            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": COSTILLA_" + lado + " → alto " + targetAlto.toFixed(1) + "cm");

        } else {
            Log.info(nombrePieza + " | " + nombreJugador +
                     ": COSTILLA_" + lado + " sin valores válidos en CSV — no escalada");
        }

    } catch(e) {
        Log.info(nombrePieza + " | " + nombreJugador +
                 ": COSTILLA_" + lado + " error (" + e.message + ") — omitida");
    }
}

// ============================================================
//  CENTRADO HORIZONTAL DE TEXTO
// ============================================================

function centrarHorizontalmente(textFrame, grupoPieza) {
    try {
        var piezaBounds  = grupoPieza.geometricBounds;
        var piezaLeft    = piezaBounds[0];
        var piezaRight   = piezaBounds[2];
        var piezaCentroX = (piezaLeft + piezaRight) / 2;

        try {
            var parrafo = textFrame.textRange.paragraphAttributes;
            parrafo.justification = Justification.CENTER;
        } catch(e) { /* ignorar si no es accesible */ }

        var tfBounds = textFrame.visibleBounds;
        var tfAncho  = Math.abs(tfBounds[2] - tfBounds[0]);
        textFrame.left = piezaCentroX - (tfAncho / 2);

    } catch(e) {
        // Si falla el centrado, el texto queda en su posición original
    }
}
