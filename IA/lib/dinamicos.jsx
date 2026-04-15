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
                if (nombrePieza === "FRENTE") {
                    var nombreFMarginSup = parseFloat(jugador.NOMBRE_F_MARGIN_SUP);
                    if (!isNaN(nombreFMarginSup) && nombreFMarginSup >= 0) {
                        posicionarItemDesdeTop(
                            itemNombre, grupoCopia,
                            nombreFMarginSup,
                            jugador.NOMBRE, nombrePieza, "NOMBRE_F"
                        );
                    }
                }
                if (nombrePieza === "ESPALDA") {
                    var nombreEMarginSup = parseFloat(jugador.NOMBRE_E_MARGIN_SUP);
                    if (!isNaN(nombreEMarginSup) && nombreEMarginSup >= 0) {
                        posicionarItemDesdeTop(
                            itemNombre, grupoCopia,
                            nombreEMarginSup,
                            jugador.NOMBRE, nombrePieza, "NOMBRE_E"
                        );
                    }
                }
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
                // Escalar — para MANGA usa NUMERO_M_IZQ_* o NUMERO_M_DER_*
                if (nombrePieza === "MANGA_IZQ" || nombrePieza === "MANGA_DER") {
                    var sufMangaNum = (nombrePieza === "MANGA_IZQ") ? "IZQ" : "DER";
                    escalarConRef(
                        itemNumero,
                        jugador["NUMERO_M_" + sufMangaNum + "_ANCHO"],
                        jugador["NUMERO_M_" + sufMangaNum + "_ALTO"],
                        jugador["NUMERO_M_" + sufMangaNum + "_REF"],
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
            if (nombrePieza === "FRENTE") {
                var escudoMarginSup = parseFloat(jugador.ESCUDO_F_MARGIN_SUP);
                if (!isNaN(escudoMarginSup) && escudoMarginSup >= 0) {
                    posicionarItemDesdeTop(
                        grupoEscudo, grupoCopia,
                        escudoMarginSup,
                        jugador.NOMBRE, nombrePieza, "ESCUDO_F"
                    );
                }
                var escudoMarginLat = parseFloat(jugador.ESCUDO_F_MARGIN_LAT);
                if (!isNaN(escudoMarginLat) && escudoMarginLat >= 0) {
                    posicionarItemDesdeLatMasCercano(
                        grupoEscudo, grupoCopia,
                        escudoMarginLat,
                        jugador.NOMBRE, nombrePieza, "ESCUDO_F"
                    );
                }
            }
        }
    }

    // ── ESCUDO_CENTRAL ──────────────────────────────────────
    // Nota: en el template ESCUDO_CENTRAL puede ser PathItem o GroupItem,
    // por eso se usa findItemByNameRecursivo (igual que LOGO_MARCA).
    var grupoEscudoCentral = findItemByNameRecursivo(dinamico, "ESCUDO_CENTRAL");

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
            var escudoCentralMarginSup = parseFloat(jugador.ESCUDO_CENTRAL_MARGIN_SUP);
            if (!isNaN(escudoCentralMarginSup) && escudoCentralMarginSup >= 0) {
                posicionarItemDesdeTop(
                    grupoEscudoCentral, grupoCopia,
                    escudoCentralMarginSup,
                    jugador.NOMBRE, nombrePieza, "ESCUDO_CENTRAL"
                );
            }
            // Centrar horizontalmente (no había llamada — era la causa del desvío)
            centrarHorizontalmente(grupoEscudoCentral, grupoCopia);
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
        var numFrenteMarginSup = parseFloat(jugador.NUMERO_FRENTE_MARGIN_SUP);
        if (!isNaN(numFrenteMarginSup) && numFrenteMarginSup >= 0) {
            posicionarItemDesdeTop(
                itemNumeroFrente, grupoCopia,
                numFrenteMarginSup,
                jugador.NOMBRE, nombrePieza, "NUMERO_FRENTE"
            );
        }
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
        var numEspaldaMarginSup = parseFloat(jugador.NUMERO_ESPALDA_MARGIN_SUP);
        if (!isNaN(numEspaldaMarginSup) && numEspaldaMarginSup >= 0) {
            posicionarItemDesdeTop(
                itemNumeroEspalda, grupoCopia,
                numEspaldaMarginSup,
                jugador.NOMBRE, nombrePieza, "NUMERO_ESPALDA"
            );
        }
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
            var spTopIzqMarginSup = parseFloat(jugador.SPONSOR_TOP_IZQ_MARGIN_SUP);
            if (!isNaN(spTopIzqMarginSup) && spTopIzqMarginSup >= 0) {
                posicionarItemDesdeTop(
                    itemSponsorTopIzq, grupoCopia,
                    spTopIzqMarginSup,
                    jugador.NOMBRE, nombrePieza, "SPONSOR_TOP_IZQ"
                );
            }
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
            var spTopDerMarginSup = parseFloat(jugador.SPONSOR_TOP_DER_MARGIN_SUP);
            if (!isNaN(spTopDerMarginSup) && spTopDerMarginSup >= 0) {
                posicionarItemDesdeTop(
                    itemSponsorTopDer, grupoCopia,
                    spTopDerMarginSup,
                    jugador.NOMBRE, nombrePieza, "SPONSOR_TOP_DER"
                );
            }
        }
    }

    // ── ESCUDO + SPONSOR_SECUNDARIO en MANGA ─────────────────
    if (nombrePieza === "MANGA_IZQ" || nombrePieza === "MANGA_DER") {
        var sufManga = (nombrePieza === "MANGA_IZQ") ? "IZQ" : "DER";
        var grupoEscudoManga           = findGroupByNameRecursivo(dinamico, CONFIG.itemEscudo);
        var itemSponsorSecundarioManga = findItemByNameRecursivo(dinamico, "SPONSOR_SECUNDARIO");

        // 1. Escalar SPONSOR_SECUNDARIO
        if (itemSponsorSecundarioManga) {
            if (jugador["LLEVA_SPONSOR_SECUNDARIO_M_" + sufManga] !== "SI") {
                itemSponsorSecundarioManga.hidden = true;
                Log.info(nombrePieza + " | " + jugador.NOMBRE + ": SPONSOR_SECUNDARIO (manga) ocultado (LLEVA=NO)");
                itemSponsorSecundarioManga = null; // evitar que el posicionado lo use
            } else {
                escalarConRef(
                    itemSponsorSecundarioManga,
                    jugador["SPONSOR_SECUNDARIO_M_" + sufManga + "_ANCHO"],
                    jugador["SPONSOR_SECUNDARIO_M_" + sufManga + "_ALTO"],
                    jugador["SPONSOR_SECUNDARIO_M_" + sufManga + "_REF"],
                    nombrePieza + " | " + jugador.NOMBRE + ": SPONSOR_SECUNDARIO (manga)"
                );
            }
        }

        // 2. Escalar ESCUDO
        if (grupoEscudoManga) {
            if (jugador["LLEVA_ESCUDO_M_" + sufManga] !== "SI") {
                grupoEscudoManga.hidden = true;
                Log.info(nombrePieza + " | " + jugador.NOMBRE + ": ESCUDO (manga) ocultado (LLEVA=NO)");
                grupoEscudoManga = null; // evitar que el posicionado lo use
            } else {
                escalarConRef(
                    grupoEscudoManga,
                    jugador["ESCUDO_M_" + sufManga + "_ANCHO"],
                    jugador["ESCUDO_M_" + sufManga + "_ALTO"],
                    jugador["ESCUDO_M_" + sufManga + "_REF"],
                    nombrePieza + " | " + jugador.NOMBRE + ": ESCUDO (manga)"
                );
            }
        }

        // 3. Posicionar verticalmente y centrar horizontalmente (independiente por elemento)
        var estaticManga = findGroupByNameRecursivo(grupoCopia, "ESTATICO");
        var mangaBounds  = estaticManga ? estaticManga.geometricBounds : grupoCopia.geometricBounds;
        var mangaBottom  = mangaBounds[3];
        var mangaLeft    = mangaBounds[0];
        var mangaRight   = mangaBounds[2];
        var mangaCentroX = (mangaLeft + mangaRight) / 2;

        if (itemSponsorSecundarioManga) {
            var ssmMarginInf = parseFloat(jugador["SPONSOR_SECUNDARIO_M_" + sufManga + "_MARGIN_INF"]);
            if (!isNaN(ssmMarginInf) && ssmMarginInf >= 0) {
                var ssmBounds = itemSponsorSecundarioManga.geometricBounds;
                var ssmAltura = Math.abs(ssmBounds[1] - ssmBounds[3]);
                var ssmAncho2 = Math.abs(ssmBounds[2] - ssmBounds[0]);
                itemSponsorSecundarioManga.top  = mangaBottom + cmToPt(ssmMarginInf) + ssmAltura;
                itemSponsorSecundarioManga.left = mangaCentroX - (ssmAncho2 / 2);
                Log.ok(nombrePieza + " | " + jugador.NOMBRE +
                       ": SPONSOR_SECUNDARIO (manga) posicionado (inf:" + ssmMarginInf.toFixed(1) + "cm)");
            }
        }

        if (grupoEscudoManga) {
            var escMarginInf = parseFloat(jugador["ESCUDO_M_" + sufManga + "_MARGIN_INF"]);
            if (!isNaN(escMarginInf) && escMarginInf >= 0) {
                var escBounds = grupoEscudoManga.geometricBounds;
                var escAltura = Math.abs(escBounds[1] - escBounds[3]);
                var escAncho2 = Math.abs(escBounds[2] - escBounds[0]);
                grupoEscudoManga.top  = mangaBottom + cmToPt(escMarginInf) + escAltura;
                grupoEscudoManga.left = mangaCentroX - (escAncho2 / 2);
                Log.ok(nombrePieza + " | " + jugador.NOMBRE +
                       ": ESCUDO (manga) posicionado (inf:" + escMarginInf.toFixed(1) + "cm)");
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
            if (nombrePieza === "FRENTE") {
                var spMarginSup = parseFloat(jugador.SPONSOR_PRINCIPAL_F_MARGIN_SUP);
                if (!isNaN(spMarginSup) && spMarginSup >= 0) {
                    posicionarItemDesdeTop(
                        itemSponsorPrincipal, grupoCopia,
                        spMarginSup,
                        jugador.NOMBRE, nombrePieza, "SPONSOR_PRINCIPAL_F"
                    );
                }
            }
            if (nombrePieza === "ESPALDA") {
                var spEMarginSup = parseFloat(jugador.SPONSOR_PRINCIPAL_E_MARGIN_SUP);
                if (!isNaN(spEMarginSup) && spEMarginSup >= 0) {
                    posicionarItemDesdeTop(
                        itemSponsorPrincipal, grupoCopia,
                        spEMarginSup,
                        jugador.NOMBRE, nombrePieza, "SPONSOR_PRINCIPAL_E"
                    );
                }
            }
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
            if (nombrePieza === "ESPALDA") {
                var ssEMarginSup = parseFloat(jugador.SPONSOR_SECUNDARIO_E_MARGIN_SUP);
                if (!isNaN(ssEMarginSup) && ssEMarginSup >= 0) {
                    posicionarItemDesdeTop(
                        itemSponsorSecundario, grupoCopia,
                        ssEMarginSup,
                        jugador.NOMBRE, nombrePieza, "SPONSOR_SECUNDARIO_E"
                    );
                }
            }
            if (nombrePieza === "FRENTE") {
                var ssFMarginSup = parseFloat(jugador.SPONSOR_SECUNDARIO_F_MARGIN_SUP);
                if (!isNaN(ssFMarginSup) && ssFMarginSup >= 0) {
                    posicionarItemDesdeTop(
                        itemSponsorSecundario, grupoCopia,
                        ssFMarginSup,
                        jugador.NOMBRE, nombrePieza, "SPONSOR_SECUNDARIO_F"
                    );
                }
            }
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
                posicionarItemDesdeTop(
                    itemEtiquetaTop, grupoCopia,
                    etqTopMarginSup,
                    jugador.NOMBRE, nombrePieza, "ETIQUETA_TOP"
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
            var logoMarginSup = parseFloat(jugador.LOGO_MARCA_MARGIN_SUP);
            if (!isNaN(logoMarginSup) && logoMarginSup >= 0) {
                posicionarItemDesdeTop(
                    itemLogoMarca, grupoCopia,
                    logoMarginSup,
                    jugador.NOMBRE, nombrePieza, "LOGO_MARCA"
                );
            }
            var logoMarginLat = parseFloat(jugador.LOGO_MARCA_MARGIN_LAT);
            if (!isNaN(logoMarginLat) && logoMarginLat >= 0) {
                posicionarItemDesdeLatMasCercano(
                    itemLogoMarca, grupoCopia,
                    logoMarginLat,
                    jugador.NOMBRE, nombrePieza, "LOGO_MARCA"
                );
            }
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
        var sufMangaL = (nombrePieza === "MANGA_IZQ") ? "IZQ" : "DER";

        var itemLineaIzq = findItemByNameRecursivo(dinamico, "MANGA_LINEA_IZQ");
        if (itemLineaIzq && jugador["LLEVA_MANGA_" + sufMangaL + "_LINEA_IZQ"] !== "SI") {
            itemLineaIzq.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": MANGA_LINEA_IZQ ocultada (LLEVA=NO)");
        } else {
            var lineaIzqAncho = parseFloat(jugador["MANGA_" + sufMangaL + "_LINEA_IZQ_ANCHO"]);
            var lineaIzqAlto  = parseFloat(jugador["MANGA_" + sufMangaL + "_LINEA_IZQ_ALTO"]);
            var lineaIzqRef   = trim((jugador["MANGA_" + sufMangaL + "_LINEA_IZQ_REF"] || "") + "").toUpperCase();
            procesarLineaManga(itemLineaIzq, "IZQ", lineaIzqAncho, lineaIzqAlto, lineaIzqRef,
                               jugador.NOMBRE, nombrePieza, factorPieza);
        }

        var itemLineaDer = findItemByNameRecursivo(dinamico, "MANGA_LINEA_DER");
        if (itemLineaDer && jugador["LLEVA_MANGA_" + sufMangaL + "_LINEA_DER"] !== "SI") {
            itemLineaDer.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": MANGA_LINEA_DER ocultada (LLEVA=NO)");
        } else {
            var lineaDerAncho = parseFloat(jugador["MANGA_" + sufMangaL + "_LINEA_DER_ANCHO"]);
            var lineaDerAlto  = parseFloat(jugador["MANGA_" + sufMangaL + "_LINEA_DER_ALTO"]);
            var lineaDerRef   = trim((jugador["MANGA_" + sufMangaL + "_LINEA_DER_REF"] || "") + "").toUpperCase();
            procesarLineaManga(itemLineaDer, "DER", lineaDerAncho, lineaDerAlto, lineaDerRef,
                               jugador.NOMBRE, nombrePieza, factorPieza);
        }

        var grupoLineaInf = findGroupByNameRecursivo(dinamico, "MANGA_LINEA_INF");
        if (grupoLineaInf && jugador["LLEVA_MANGA_" + sufMangaL + "_LINEA_INF"] !== "SI") {
            grupoLineaInf.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": MANGA_LINEA_INF ocultada (LLEVA=NO)");
        } else {
            var lineaInfAncho = parseFloat(jugador["MANGA_" + sufMangaL + "_LINEA_INF_ANCHO"]);
            var lineaInfAlto  = parseFloat(jugador["MANGA_" + sufMangaL + "_LINEA_INF_ALTO"]);
            var lineaInfRef   = trim((jugador["MANGA_" + sufMangaL + "_LINEA_INF_REF"] || "") + "").toUpperCase();
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
    if (nombrePieza === "MANGA_IZQ") {
        if (elemento === "NOMBRE") return jugador.LLEVA_NOMBRE_E    === "SI";
        if (elemento === "NUMERO") return jugador.LLEVA_NUMERO_M_IZQ === "SI";
    }
    if (nombrePieza === "MANGA_DER") {
        if (elemento === "NOMBRE") return jugador.LLEVA_NOMBRE_E    === "SI";
        if (elemento === "NUMERO") return jugador.LLEVA_NUMERO_M_DER === "SI";
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

function posicionarItemDesdeTop(item, grupoPieza, marginSupCm, nombreJugador, nombrePieza, labelItem) {
    try {
        var estatico  = findGroupByNameRecursivo(grupoPieza, "ESTATICO");
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

        } else if (ref === "AMBOS" && !isNaN(targetAncho) && targetAncho > 0 && !isNaN(targetAlto) && targetAlto > 0) {
            var anchoActCmA = ptToCm(Math.abs(rightAntes - leftAntes));
            var altoActCmA  = ptToCm(Math.abs(boundsAntes[1] - boundsAntes[3]));
            if (anchoActCmA <= 0 || altoActCmA <= 0) return;
            var factorAnchoA = (targetAncho / anchoActCmA) * 100;
            var factorAltoA  = (targetAlto  / altoActCmA)  * 100;
            var bottomAntes  = boundsAntes[3];

            grupoCostilla.resize(factorAnchoA, factorAltoA, true, true, true, true, 100, Transformation.TOPLEFT);

            var boundsDespuesA = grupoCostilla.geometricBounds;
            var nuevoAnchoA    = Math.abs(boundsDespuesA[2] - boundsDespuesA[0]);
            var nuevoAltoA     = Math.abs(boundsDespuesA[1] - boundsDespuesA[3]);

            grupoCostilla.left = (lado === "IZQ") ? leftAntes : rightAntes - nuevoAnchoA;
            grupoCostilla.top  = bottomAntes + nuevoAltoA;

            Log.ok(nombrePieza + " | " + nombreJugador +
                   ": COSTILLA_" + lado + " → ambos " + targetAncho.toFixed(1) + "x" + targetAlto.toFixed(1) + "cm (ancla inf)");

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
