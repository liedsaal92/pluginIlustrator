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
    var grupoEscudo = findGroupByNameRecursivo(dinamico, CONFIG.itemEscudo)
                   || findItemByNameRecursivo(dinamico, CONFIG.itemEscudo);
    var _ladoEscudoF = null; // se captura para que LOGO_MARCA vaya al lado opuesto

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
                    _ladoEscudoF = posicionarItemDesdeLatMasCercano(
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
            var spTopIzqMarginLat = parseFloat(jugador.SPONSOR_TOP_IZQ_MARGIN_LAT);
            if (!isNaN(spTopIzqMarginLat) && spTopIzqMarginLat >= 0) {
                posicionarItemDesdeLatMasCercano(
                    itemSponsorTopIzq, grupoCopia,
                    spTopIzqMarginLat,
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
            var spTopDerMarginLat = parseFloat(jugador.SPONSOR_TOP_DER_MARGIN_LAT);
            if (!isNaN(spTopDerMarginLat) && spTopDerMarginLat >= 0) {
                posicionarItemDesdeLatMasCercano(
                    itemSponsorTopDer, grupoCopia,
                    spTopDerMarginLat,
                    jugador.NOMBRE, nombrePieza, "SPONSOR_TOP_DER"
                );
            }
        }
    }

    // ── SPONSOR_TOP_IZQ_SEC ──────────────────────────────────
    var itemSponsorTopIzqSec = findItemByNameRecursivo(dinamico, "SPONSOR_TOP_IZQ_SEC");

    if (itemSponsorTopIzqSec) {
        if (jugador.LLEVA_SPONSOR_TOP_IZQ_SEC !== "SI") {
            itemSponsorTopIzqSec.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": SPONSOR_TOP_IZQ_SEC ocultado (LLEVA=NO)");
        } else {
            escalarConRef(
                itemSponsorTopIzqSec,
                jugador.SPONSOR_TOP_IZQ_SEC_ANCHO,
                jugador.SPONSOR_TOP_IZQ_SEC_ALTO,
                jugador.SPONSOR_TOP_IZQ_SEC_REF,
                nombrePieza + " | " + jugador.NOMBRE + ": SPONSOR_TOP_IZQ_SEC"
            );
            var spTopIzqSecMarginSup = parseFloat(jugador.SPONSOR_TOP_IZQ_SEC_MARGIN_SUP);
            if (!isNaN(spTopIzqSecMarginSup) && spTopIzqSecMarginSup >= 0) {
                posicionarItemDesdeTop(
                    itemSponsorTopIzqSec, grupoCopia,
                    spTopIzqSecMarginSup,
                    jugador.NOMBRE, nombrePieza, "SPONSOR_TOP_IZQ_SEC"
                );
            }
            var spTopIzqSecMarginLat = parseFloat(jugador.SPONSOR_TOP_IZQ_SEC_MARGIN_LAT);
            if (!isNaN(spTopIzqSecMarginLat) && spTopIzqSecMarginLat >= 0) {
                posicionarItemDesdeLatMasCercano(
                    itemSponsorTopIzqSec, grupoCopia,
                    spTopIzqSecMarginLat,
                    jugador.NOMBRE, nombrePieza, "SPONSOR_TOP_IZQ_SEC"
                );
            }
        }
    }

    // ── SPONSOR_TOP_DER_SEC ──────────────────────────────────
    var itemSponsorTopDerSec = findItemByNameRecursivo(dinamico, "SPONSOR_TOP_DER_SEC");

    if (itemSponsorTopDerSec) {
        if (jugador.LLEVA_SPONSOR_TOP_DER_SEC !== "SI") {
            itemSponsorTopDerSec.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": SPONSOR_TOP_DER_SEC ocultado (LLEVA=NO)");
        } else {
            escalarConRef(
                itemSponsorTopDerSec,
                jugador.SPONSOR_TOP_DER_SEC_ANCHO,
                jugador.SPONSOR_TOP_DER_SEC_ALTO,
                jugador.SPONSOR_TOP_DER_SEC_REF,
                nombrePieza + " | " + jugador.NOMBRE + ": SPONSOR_TOP_DER_SEC"
            );
            var spTopDerSecMarginSup = parseFloat(jugador.SPONSOR_TOP_DER_SEC_MARGIN_SUP);
            if (!isNaN(spTopDerSecMarginSup) && spTopDerSecMarginSup >= 0) {
                posicionarItemDesdeTop(
                    itemSponsorTopDerSec, grupoCopia,
                    spTopDerSecMarginSup,
                    jugador.NOMBRE, nombrePieza, "SPONSOR_TOP_DER_SEC"
                );
            }
            var spTopDerSecMarginLat = parseFloat(jugador.SPONSOR_TOP_DER_SEC_MARGIN_LAT);
            if (!isNaN(spTopDerSecMarginLat) && spTopDerSecMarginLat >= 0) {
                posicionarItemDesdeLatMasCercano(
                    itemSponsorTopDerSec, grupoCopia,
                    spTopDerSecMarginLat,
                    jugador.NOMBRE, nombrePieza, "SPONSOR_TOP_DER_SEC"
                );
            }
        }
    }

    // ── ESCUDO + SPONSOR_SECUNDARIO en MANGA ─────────────────
    if (nombrePieza === "MANGA_IZQ" || nombrePieza === "MANGA_DER") {
        var sufManga = (nombrePieza === "MANGA_IZQ") ? "IZQ" : "DER";
        var grupoEscudoManga           = findGroupByNameRecursivo(dinamico, CONFIG.itemEscudo)
                                       || findItemByNameRecursivo(dinamico, CONFIG.itemEscudo);
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
        var mangaBounds  = getEstaticoRefBounds(estaticManga, grupoCopia.geometricBounds);
        var mangaBottom  = mangaBounds[3];
        var mangaLeft    = mangaBounds[0];
        var mangaRight   = mangaBounds[2];
        var mangaCentroX = (mangaLeft + mangaRight) / 2;

        Log._linea("-----", nombrePieza + " | " + jugador.NOMBRE +
            ": DIAG MANGA ref=" + (estaticManga ? "ESTATICO" : "grupoCopia") +
            " L=" + ptToCm(mangaLeft).toFixed(4) + "cm" +
            " T=" + ptToCm(mangaBounds[1]).toFixed(4) + "cm" +
            " R=" + ptToCm(mangaRight).toFixed(4) + "cm" +
            " B=" + ptToCm(mangaBottom).toFixed(4) + "cm" +
            " W=" + ptToCm(Math.abs(mangaRight-mangaLeft)).toFixed(4) + "cm" +
            " H=" + ptToCm(Math.abs(mangaBounds[1]-mangaBottom)).toFixed(4) + "cm");

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

        // 4. Posicionar NUMERO (manga) desde el borde inferior
        // NUMERO es un Area TextFrame: el borde geométrico incluye espacio vacío debajo
        // del glifo. Usamos visual bounds (outlines) para saber dónde está el glifo real
        // y posicionamos con .top (documento-coords), no translate() — translate opera
        // en coordenadas locales del grupo escalado (DINAMICO) y aplica factor incorrecto.
        if (itemNumero && jugador.TIENE_NUMERO !== "NO" && llevaNumeroEnEstaPieza) {
            var numMangaMarginInf = parseFloat(jugador["NUMERO_M_" + sufManga + "_MARGIN_INF"]);
            if (!isNaN(numMangaMarginInf) && numMangaMarginInf >= 0) {
                var numMBounds     = itemNumero.geometricBounds;
                var numMAncho      = Math.abs(numMBounds[2] - numMBounds[0]);
                var numTargetBot   = mangaBottom + cmToPt(numMangaMarginInf);

                // Obtener borde inferior VISUAL del glifo para alinear correctamente
                var numVB = getTextVisualBounds(itemNumero);
                var numVisualBot = numVB ? numVB[3] : numMBounds[3];

                Log._linea("-----", nombrePieza + " | " + jugador.NOMBRE +
                    ": DIAG NUMERO geomTop=" + ptToCm(numMBounds[1]).toFixed(4) + "cm" +
                    " geomBot=" + ptToCm(numMBounds[3]).toFixed(4) + "cm" +
                    " visualBot=" + ptToCm(numVisualBot).toFixed(4) + "cm" +
                    " targetBot=" + ptToCm(numTargetBot).toFixed(4) + "cm");

                // .top es geomTop; queremos: visualBot + delta = targetBot
                // → nuevo .top = geomTop + (targetBot - visualBot)
                var numTopNuevo = numMBounds[1] + (numTargetBot - numVisualBot);
                itemNumero.top  = numTopNuevo;
                itemNumero.left = mangaCentroX - (numMAncho / 2);

                var numMBoundsPost = itemNumero.geometricBounds;
                Log._linea("-----", nombrePieza + " | " + jugador.NOMBRE +
                    ": DIAG NUMERO POST" +
                    " geomTop=" + ptToCm(numMBoundsPost[1]).toFixed(4) + "cm" +
                    " geomBot=" + ptToCm(numMBoundsPost[3]).toFixed(4) + "cm" +
                    " distBotManga=" + ptToCm(numMBoundsPost[3] - mangaBottom).toFixed(4) + "cm");

                Log.ok(nombrePieza + " | " + jugador.NOMBRE +
                       ": NUMERO (manga) posicionado (inf:" + numMangaMarginInf.toFixed(1) + "cm)");
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
            centrarHorizontalmente(itemSponsorPrincipal, grupoCopia);
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
            centrarHorizontalmente(itemEtiquetaTop, grupoCopia);
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
                // LOGO_MARCA va al lado opuesto del ESCUDO (si ESCUDO fue posicionado).
                // Si no hay ESCUDO, auto-detecta por posición del item.
                var _logoLadoOpuesto = (_ladoEscudoF === "IZQ") ? "DER"
                                     : (_ladoEscudoF === "DER") ? "IZQ"
                                     : null;
                if (_logoLadoOpuesto) {
                    Log._linea("-----", "LOGO_MARCA: lado opuesto a ESCUDO (" + _ladoEscudoF + ") → forzando " + _logoLadoOpuesto);
                }
                posicionarItemDesdeLatMasCercano(
                    itemLogoMarca, grupoCopia,
                    logoMarginLat,
                    jugador.NOMBRE, nombrePieza, "LOGO_MARCA",
                    _logoLadoOpuesto
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
                               jugador.NOMBRE, nombrePieza, factorPieza, grupoCopia);
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
                               jugador.NOMBRE, nombrePieza, factorPieza, grupoCopia);
        }

        var grupoLineaInf = findItemByNameRecursivo(dinamico, "MANGA_LINEA_INF");
        if (grupoLineaInf && jugador["LLEVA_MANGA_" + sufMangaL + "_LINEA_INF"] !== "SI") {
            grupoLineaInf.hidden = true;
            Log.info(nombrePieza + " | " + jugador.NOMBRE + ": MANGA_LINEA_INF ocultada (LLEVA=NO)");
        } else {
            var lineaInfAncho = parseFloat(jugador["MANGA_" + sufMangaL + "_LINEA_INF_ANCHO"]);
            var lineaInfAlto  = parseFloat(jugador["MANGA_" + sufMangaL + "_LINEA_INF_ALTO"]);
            var lineaInfRef   = trim((jugador["MANGA_" + sufMangaL + "_LINEA_INF_REF"] || "") + "").toUpperCase();
            procesarLineaMangaInf(grupoLineaInf, lineaInfAncho, lineaInfAlto, lineaInfRef,
                                  jugador.NOMBRE, nombrePieza, factorPieza, grupoCopia);
        }

        // ── LINEAS ADIDAS (manga ranglan) ─────────────────────
        var itemLineasAdidas = findItemByNameRecursivo(dinamico, "LINEAS_ADIDAS");
        if (itemLineasAdidas) {
            if (jugador["LLEVA_LINEAS_ADIDAS_M_" + sufMangaL] !== "SI") {
                itemLineasAdidas.hidden = true;
                Log.info(nombrePieza + " | " + jugador.NOMBRE + ": LINEAS_ADIDAS ocultadas (LLEVA=NO)");
            } else {
                var laAncho    = parseFloat(jugador["LINEAS_ADIDAS_M_" + sufMangaL + "_ANCHO"]);
                var laRef      = trim((jugador["LINEAS_ADIDAS_M_" + sufMangaL + "_REF"] || "") + "").toUpperCase();
                var laMarginInf = parseFloat(jugador["LINEAS_ADIDAS_M_" + sufMangaL + "_MARGIN_INF"]);
                var laRanglan  = trim((jugador["MANGA_" + sufMangaL + "_ES_RANGLAN"] || "NO") + "").toUpperCase();
                procesarLineasAdidas(
                    itemLineasAdidas, sufMangaL,
                    laAncho, laRef, laMarginInf, laRanglan,
                    grupoCopia, jugador.NOMBRE, nombrePieza
                );
            }
        }

        // ── POST MANGA: dump final positions of all line items ──
        var _pIzq = findItemByNameRecursivo(dinamico, "MANGA_LINEA_IZQ");
        var _pDer = findItemByNameRecursivo(dinamico, "MANGA_LINEA_DER");
        var _pInf = findItemByNameRecursivo(dinamico, "MANGA_LINEA_INF");
        if (_pIzq) {
            var _bIzq = _pIzq.geometricBounds;
            Log._linea("-----", nombrePieza + " | " + jugador.NOMBRE +
                ": POST LINEA_IZQ L=" + ptToCm(_bIzq[0]).toFixed(3) +
                " T=" + ptToCm(_bIzq[1]).toFixed(3) +
                " R=" + ptToCm(_bIzq[2]).toFixed(3) +
                " B=" + ptToCm(_bIzq[3]).toFixed(3) +
                " W=" + ptToCm(Math.abs(_bIzq[2]-_bIzq[0])).toFixed(3) +
                " H=" + ptToCm(Math.abs(_bIzq[1]-_bIzq[3])).toFixed(3) +
                " clipped=" + (typeof _pIzq.clipped !== "undefined" ? (_pIzq.clipped ? "SI" : "NO") : "n/a") +
                " hidden=" + (_pIzq.hidden ? "SI" : "NO"));
        }
        if (_pDer) {
            var _bDer = _pDer.geometricBounds;
            Log._linea("-----", nombrePieza + " | " + jugador.NOMBRE +
                ": POST LINEA_DER L=" + ptToCm(_bDer[0]).toFixed(3) +
                " T=" + ptToCm(_bDer[1]).toFixed(3) +
                " R=" + ptToCm(_bDer[2]).toFixed(3) +
                " B=" + ptToCm(_bDer[3]).toFixed(3) +
                " W=" + ptToCm(Math.abs(_bDer[2]-_bDer[0])).toFixed(3) +
                " H=" + ptToCm(Math.abs(_bDer[1]-_bDer[3])).toFixed(3) +
                " clipped=" + (typeof _pDer.clipped !== "undefined" ? (_pDer.clipped ? "SI" : "NO") : "n/a") +
                " hidden=" + (_pDer.hidden ? "SI" : "NO"));
        }
        if (_pInf) {
            var _bInf = _pInf.geometricBounds;
            Log._linea("-----", nombrePieza + " | " + jugador.NOMBRE +
                ": POST LINEA_INF L=" + ptToCm(_bInf[0]).toFixed(3) +
                " T=" + ptToCm(_bInf[1]).toFixed(3) +
                " R=" + ptToCm(_bInf[2]).toFixed(3) +
                " B=" + ptToCm(_bInf[3]).toFixed(3) +
                " W=" + ptToCm(Math.abs(_bInf[2]-_bInf[0])).toFixed(3) +
                " H=" + ptToCm(Math.abs(_bInf[1]-_bInf[3])).toFixed(3) +
                " hidden=" + (_pInf.hidden ? "SI" : "NO"));
        }
    }
}

// ============================================================
//  HELPERS INTERNOS
// ============================================================

// Escala un item usando la lógica ANCHO / ALTO / PROPORCIONAL.
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

