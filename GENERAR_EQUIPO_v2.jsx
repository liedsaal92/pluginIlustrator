// ============================================================
//  GENERAR_EQUIPO.jsx  —  v2.0
//  Sublimania — Generador automático de equipos deportivos
//
//  Requiere:
//    - Adobe Illustrator CS6 o superior
//    - Plantilla .ai con capa TEMPLATE estructurada
//    - Archivo EQUIPO.xlsx con hoja DATOS_CSV
//
//  Requerimientos: REQUERIMIENTOS_GENERAR_EQUIPO_v1.2.md
// ============================================================

// ─── CONFIGURACIÓN GLOBAL ───────────────────────────────────

var CONFIG = {
    // Dimensiones base de la plantilla .ai (en cm)
    // Si cambias el tamaño del template, actualiza estos valores
    templateBase: {
        frente:   { ancho: 42, alto: 59 },
        espalda:  { ancho: 42, alto: 59 },
        manga_izq: { ancho: 46, alto: 28.5 }, // medido en plantilla .ai
        manga_der: { ancho: 46, alto: 28.5 }  // simetrica a manga_izq
    },

    // Ancho máximo del plóter en cm
    ploterAncho: 130,

    // Separación entre piezas (en puntos)
    gapX: 20,
    gapY: 20,
    gapSeccion: 50, // separación entre secciones de piezas

    // Nombres exactos de grupos en la plantilla
    piezas: ["FRENTE", "ESPALDA", "MANGA_IZQ", "MANGA_DER"],

    // Nombres de items dinámicos dentro de DINAMICO
    itemNombre: "NOMBRE",
    itemNumero: "NUMERO",
    itemLogo:   "LOGO",

    // Hoja del xlsx que contiene los jugadores
    hojaCSV: "DATOS_CSV"
};

var CM_TO_PT = 28.3464567;

// ─── SISTEMA DE LOG ─────────────────────────────────────────

var Log = {
    lineas:    [],
    resumen:   { ok: 0, info: 0, error: 0, fatal: 0 },
    omisiones: [],
    errores:   [],

    _linea: function(prefijo, msg) {
        var linea = prefijo + " " + msg;
        this.lineas.push(linea);
    },

    ok: function(msg) {
        this._linea("[OK]   ", msg);
        this.resumen.ok++;
    },

    info: function(msg) {
        this._linea("[INFO] ", msg);
        this.resumen.info++;
        this.omisiones.push(msg);
    },

    error: function(msg) {
        this._linea("[ERROR]", msg);
        this.resumen.error++;
        this.errores.push(msg);
    },

    fatal: function(msg) {
        this._linea("[FATAL]", msg);
        this.resumen.fatal++;
        this.errores.push("FATAL: " + msg);
    },

    exportar: function(carpeta) {
        var timestamp = getTimestamp();
        var archivo = new File(carpeta + "/log_equipo_" + timestamp + ".txt");
        archivo.encoding = "UTF-8";
        archivo.open("w");

        archivo.writeln("================================================");
        archivo.writeln("  GENERAR_EQUIPO.jsx v2.0 — Log de ejecución");
        archivo.writeln("  " + new Date().toString());
        archivo.writeln("================================================");
        archivo.writeln("");

        for (var i = 0; i < this.lineas.length; i++) {
            archivo.writeln(this.lineas[i]);
        }

        archivo.writeln("");
        archivo.writeln("================================================");
        archivo.writeln("  RESUMEN FINAL");
        archivo.writeln("================================================");
        archivo.writeln("OK     : " + this.resumen.ok);
        archivo.writeln("INFO   : " + this.resumen.info);
        archivo.writeln("ERROR  : " + this.resumen.error);
        archivo.writeln("FATAL  : " + this.resumen.fatal);

        if (this.omisiones.length > 0) {
            archivo.writeln("");
            archivo.writeln("OMISIONES (" + this.omisiones.length + "):");
            for (var o = 0; o < this.omisiones.length; o++) {
                archivo.writeln("  - " + this.omisiones[o]);
            }
        }

        if (this.errores.length > 0) {
            archivo.writeln("");
            archivo.writeln("ERRORES Y FATALES (" + this.errores.length + "):");
            for (var e = 0; e < this.errores.length; e++) {
                archivo.writeln("  - " + this.errores[e]);
            }
        }

        archivo.writeln("");
        archivo.writeln("Log guardado en: " + archivo.fsName);
        archivo.close();

        return archivo.fsName;
    }
};

// ─── ENTRADA PRINCIPAL ──────────────────────────────────────

function main() {

    // 1. Verificar que hay un documento abierto (la plantilla)
    if (app.documents.length === 0) {
        alert("No hay ningún documento abierto.\nAbre la plantilla .ai y vuelve a ejecutar el script.");
        return;
    }

    var doc = app.activeDocument;

    // 2. Seleccionar CSV
    var csvFile = File.openDialog(
        "Selecciona el archivo CSV (exportado de hoja DATOS_CSV)",
        "*.csv"
    );
    if (!csvFile) {
        alert("No se seleccionó ningún archivo CSV. Script cancelado.");
        return;
    }

    // 3. Seleccionar carpeta de log
    var logFolder = Folder.selectDialog(
        "Selecciona la carpeta donde guardar el log"
    );
    if (!logFolder) logFolder = csvFile.parent;

    Log._linea("-----", "Documento : " + doc.name);
    Log._linea("-----", "CSV       : " + csvFile.fsName);

    // 4. Leer CSV
    var jugadores = leerXlsx(csvFile);
    if (jugadores === null || jugadores.length === 0) {
        Log.fatal("No se encontraron jugadores válidos en el CSV");
        var lp = Log.exportar(logFolder.fsName);
        alert("ERROR FATAL: No hay jugadores válidos.\nRevisa el log: " + lp);
        return;
    }
    Log._linea("-----", "Jugadores : " + jugadores.length);

    // 5. Validar plantilla ANTES de modificar nada
    var validacion = validarPlantilla(doc);
    if (!validacion.ok) {
        Log.fatal(validacion.mensaje);
        var lp = Log.exportar(logFolder.fsName);
        alert("ERROR FATAL: " + validacion.mensaje + "\n\nRevisa el log: " + lp);
        return;
    }

    var gruposDisponibles = validacion.grupos;
    Log._linea("-----", "Piezas    : " + gruposDisponibles.nombres.join(", "));

    // 6. Crear capa GENERADO dentro del mismo documento
    //    Si ya existe de una ejecución anterior, la eliminamos y recreamos
    var capaGenerado;
    try {
        capaGenerado = doc.layers.getByName("GENERADO");
        // Eliminar todos los items de la capa anterior
        while (capaGenerado.pageItems.length > 0) {
            capaGenerado.pageItems[0].remove();
        }
        Log._linea("-----", "Capa GENERADO existente limpiada");
    } catch(e) {
        capaGenerado = doc.layers.add();
        capaGenerado.name = "GENERADO";
        Log._linea("-----", "Capa GENERADO creada");
    }

    // Mover GENERADO al frente (encima de TEMPLATE)
    capaGenerado.zOrder(ZOrderMethod.BRINGTOFRONT);

    // 7. Ocultar capa TEMPLATE durante el proceso para no confundir visualmente
    var templateLayer = validacion.templateLayer;
    var templateVisible = templateLayer.visible;
    templateLayer.visible = false;

    // 8. Procesar piezas
    var docAncho  = doc.width;
    var currentY  = 0;

    for (var p = 0; p < CONFIG.piezas.length; p++) {
        var nombrePieza   = CONFIG.piezas[p];
        var grupoTemplate = gruposDisponibles.grupos[nombrePieza];

        if (!grupoTemplate) {
            Log.info("Pieza '" + nombrePieza + "' no encontrada en plantilla — omitida");
            continue;
        }

        Log._linea("-----", "");
        Log._linea("-----", "=== " + nombrePieza + " ===");

        var offsetX       = 0;
        var filaMaxHeight = 0;

        for (var i = 0; i < jugadores.length; i++) {
            var j = jugadores[i];

            try {
                var dims = getDimensiones(j, nombrePieza);
                if (!dims) {
                    Log.error(nombrePieza + " | " + j.NOMBRE + ": dimensiones inválidas — omitido");
                    continue;
                }

                // Duplicar dentro del mismo documento, en la capa GENERADO
                var copia = grupoTemplate.duplicate(
                    capaGenerado,
                    ElementPlacement.PLACEATEND
                );

                // Escalar
                var base = getBaseParaPieza(nombrePieza);
                scaleGroupExact(copia, dims.ancho, dims.alto, base);

                // Aplicar dinámicos
                aplicarDinamicos(copia, j, nombrePieza);

                // Nombrar
                var numStr = (j.TIENE_NUMERO === "SI" && j.NUMERO !== "") ? j.NUMERO : "SN";
                copia.name = nombrePieza + "_" + sanitizar(j.NOMBRE) + "_" + numStr + "_" + j.TALLA;

                // Layout
                var gW = Math.abs(copia.width);
                var gH = Math.abs(copia.height);

                // Salto de fila
                if (offsetX + gW > docAncho && offsetX > 0) {
                    currentY     -= filaMaxHeight + CONFIG.gapY;
                    offsetX       = 0;
                    filaMaxHeight = 0;
                }

                if (gW > docAncho) {
                    Log.info(nombrePieza + " | " + j.NOMBRE +
                             ": pieza (" + ptToCm(gW).toFixed(1) + "cm) supera ancho del plóter");
                }

                copia.left = offsetX;
                copia.top  = currentY;

                filaMaxHeight = Math.max(filaMaxHeight, gH);
                offsetX      += gW + CONFIG.gapX;

                Log.ok(nombrePieza + " | " + j.NOMBRE +
                       " | T:" + j.TALLA +
                       " | " + dims.ancho.toFixed(1) + "x" + dims.alto.toFixed(1) + "cm");

            } catch (e) {
                Log.error(nombrePieza + " | " + j.NOMBRE + ": " + e.message);
            }
        }

        currentY -= filaMaxHeight + CONFIG.gapSeccion;
    }

    // 9. Restaurar visibilidad de TEMPLATE
    templateLayer.visible = templateVisible;

    // 10. Log y resumen
    var logPath = Log.exportar(logFolder.fsName);

    alert(
        "Proceso completado\n\n" +
        "OK     : " + Log.resumen.ok     + " piezas\n" +
        "INFO   : " + Log.resumen.info   + " omisiones\n" +
        "ERROR  : " + Log.resumen.error  + " errores\n\n" +
        "Las piezas están en la capa GENERADO\n" +
        "Log: " + logPath
    );
}


// ============================================================
//  LECTURA DEL CSV
//  Formato: CSV separado por comas, UTF-8, primera fila = headers
//  Exportar desde Excel: hoja DATOS_CSV → Guardar como → CSV UTF-8
// ============================================================

function leerXlsx(csvFile) {
    try {
        if (!csvFile.exists) {
            Log.fatal("Archivo no encontrado: " + csvFile.fsName);
            return null;
        }

        csvFile.encoding = "UTF-8";
        csvFile.open("r");
        var content = csvFile.read();
        csvFile.close();

        // Normalizar saltos de línea Windows (\r\n) y Mac antiguo (\r)
        content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

        var lineas = content.split("\n");

        if (lineas.length < 2) {
            Log.fatal("El CSV tiene menos de 2 líneas (sin datos)");
            return null;
        }

        // ── Parsear headers ──────────────────────────────────
        var headers = parsearLineaCSV(lineas[0]);
        for (var h = 0; h < headers.length; h++) {
            headers[h] = trim(headers[h]).toUpperCase();
        }
        Log._linea("-----", "Columnas CSV: " + headers.join(" | "));

        // ── Parsear jugadores ────────────────────────────────
        var jugadores = [];

        for (var r = 1; r < lineas.length; r++) {
            var linea = trim(lineas[r]);
            if (linea === "") continue;

            var valores = parsearLineaCSV(linea);
            var obj = {};

            for (var h2 = 0; h2 < headers.length; h2++) {
                obj[headers[h2]] = "";
            }

            for (var c = 0; c < headers.length; c++) {
                var val = (valores[c] !== undefined) ? trim(valores[c]) : "";

                // Ignorar errores exportados desde Excel
                if (val === "#N/A"   || val === "#VALUE!" ||
                    val === "#REF!"  || val === "#DIV/0!" ||
                    val === "#NAME?" || val === "#NULL!") {
                    val = "";
                }

                var hdr = headers[c];

                // Convertir campos numéricos
                if (hdr === "NUMERO"     || hdr === "LOGO_ANCHO" ||
                    hdr === "ALTO"       || hdr === "ANCHO"       ||
                    hdr === "MANGA_ALTO" || hdr === "MANGA_ANCHO") {
                    var num = parseFloat(val);
                    obj[hdr] = isNaN(num) ? "" : num;
                } else {
                    obj[hdr] = val;
                }
            }

            // Filtrar filas sin NOMBRE
            if (!obj.NOMBRE || trim(obj.NOMBRE) === "") continue;


            // Normalizar TIENE_NUMERO
            obj.TIENE_NUMERO = (trim(obj.TIENE_NUMERO + "").toUpperCase() === "SI")
                               ? "SI" : "NO";

            // Normalizar campos LLEVA_*
            var llevaFields = [
                "LLEVA_NOMBRE_F", "LLEVA_NOMBRE_E",
                "LLEVA_NUMERO_F", "LLEVA_NUMERO_E", "LLEVA_NUMERO_M"
            ];
            for (var lf = 0; lf < llevaFields.length; lf++) {
                var campo = llevaFields[lf];
                obj[campo] = (trim((obj[campo] || "") + "").toUpperCase() === "SI")
                             ? "SI" : "NO";
            }

            jugadores.push(obj);

            Log._linea("-----",
                "CSV | " + obj.NOMBRE +
                " | T:" + obj.TALLA +
                " | Num:" + (obj.NUMERO !== "" ? obj.NUMERO : "--") +
                " | Logo:" + obj.LOGO_ANCHO + "cm"
            );
        }

        Log._linea("-----", "Jugadores validos: " + jugadores.length);
        return jugadores;

    } catch (e) {
        Log.fatal("Error al leer CSV: " + e.message);
        return null;
    }
}

// Parsea una línea CSV respetando campos entre comillas
// Ejemplo: 'Juan,"Lopez, Jr.",10' -> ["Juan", "Lopez, Jr.", "10"]
function parsearLineaCSV(linea) {
    var campos = [];
    var campo  = "";
    var dentroComillas = false;

    for (var i = 0; i < linea.length; i++) {
        var c = linea.charAt(i);

        if (c === '"') {
            if (dentroComillas && linea.charAt(i + 1) === '"') {
                campo += '"';
                i++;
            } else {
                dentroComillas = !dentroComillas;
            }
        } else if (c === "," && !dentroComillas) {
            campos.push(campo);
            campo = "";
        } else {
            campo += c;
        }
    }
    campos.push(campo);
    return campos;
}

//  VALIDACIÓN DE PLANTILLA
// ============================================================

function validarPlantilla(doc) {
    // 1. Buscar capa TEMPLATE
    var templateLayer = getLayerByName(doc, "TEMPLATE");
    if (!templateLayer) {
        return {
            ok: false,
            mensaje: "No se encontró la capa 'TEMPLATE' en el documento '" +
                     doc.name + "'"
        };
    }

    // 2. Log de diagnóstico: mostrar TODOS los items de primer nivel en TEMPLATE
    //    Esto ayuda a detectar si los grupos están donde se espera
    var diagMsg = "Items en capa TEMPLATE: ";
    for (var di = 0; di < templateLayer.pageItems.length; di++) {
        var dItem = templateLayer.pageItems[di];
        diagMsg += "[" + dItem.typename + " '" + dItem.name + "'] ";
    }
    Log._linea("DIAG ", diagMsg);

    // 3. Buscar grupos de piezas — busca en pageItems de la capa
    var grupos = { nombres: [], grupos: {} };

    for (var p = 0; p < CONFIG.piezas.length; p++) {
        var nombre = CONFIG.piezas[p];
        var grupo  = findGroupByNameDirect(templateLayer, nombre);
        if (grupo) {
            // Log de diagnóstico: mostrar estructura interna de cada pieza
            var innerMsg = "Items en " + nombre + ": ";
            for (var ii = 0; ii < grupo.pageItems.length; ii++) {
                innerMsg += "[" + grupo.pageItems[ii].typename +
                            " '" + grupo.pageItems[ii].name + "'] ";
            }
            Log._linea("DIAG ", innerMsg);
            grupos.nombres.push(nombre);
            grupos.grupos[nombre] = grupo;
        } else {
            Log._linea("DIAG ", "NO encontrado en primer nivel: " + nombre);
        }
    }

    if (grupos.nombres.length === 0) {
        return {
            ok: false,
            mensaje: "No se encontró ningún grupo de pieza (FRENTE, ESPALDA, " +
                     "MANGA_IZQ, MANGA_DER) dentro de la capa TEMPLATE"
        };
    }

    // 3. Verificar duplicados dentro de cada pieza
    for (var nombre in grupos.grupos) {
        var grupo = grupos.grupos[nombre];
        var dupCheck = verificarDuplicados(grupo, nombre);
        if (!dupCheck.ok) {
            return { ok: false, mensaje: dupCheck.mensaje };
        }
    }

    return { ok: true, grupos: grupos, templateLayer: templateLayer };
}

function verificarDuplicados(grupoPieza, nombrePieza) {
    // Buscar DINAMICO dentro de la pieza
    var dinamicos = findAllGroupsByName(grupoPieza, "DINAMICO");
    if (dinamicos.length > 1) {
        return {
            ok: false,
            mensaje: "Se encontraron " + dinamicos.length +
                     " grupos llamados 'DINAMICO' dentro de '" +
                     nombrePieza + "'. Debe haber máximo 1."
        };
    }

    var estaticos = findAllGroupsByName(grupoPieza, "ESTATICO");
    if (estaticos.length > 1) {
        return {
            ok: false,
            mensaje: "Se encontraron " + estaticos.length +
                     " grupos llamados 'ESTATICO' dentro de '" +
                     nombrePieza + "'. Debe haber máximo 1."
        };
    }

    // Si existe DINAMICO, verificar duplicados de NOMBRE, NUMERO, LOGO dentro
    if (dinamicos.length === 1) {
        var dinamico = dinamicos[0];

        var nombres  = findAllItemsByName(dinamico, "NOMBRE");
        var numeros  = findAllItemsByName(dinamico, "NUMERO");
        var logos    = findAllGroupsByName(dinamico, "LOGO");

        if (nombres.length > 1) {
            return {
                ok: false,
                mensaje: "Se encontraron " + nombres.length +
                         " items llamados 'NOMBRE' dentro de DINAMICO en '" +
                         nombrePieza + "'. Debe haber máximo 1."
            };
        }
        if (numeros.length > 1) {
            return {
                ok: false,
                mensaje: "Se encontraron " + numeros.length +
                         " items llamados 'NUMERO' dentro de DINAMICO en '" +
                         nombrePieza + "'. Debe haber máximo 1."
            };
        }
        if (logos.length > 1) {
            return {
                ok: false,
                mensaje: "Se encontraron " + logos.length +
                         " grupos llamados 'LOGO' dentro de DINAMICO en '" +
                         nombrePieza + "'. Debe haber máximo 1."
            };
        }
    }

    return { ok: true };
}

// ============================================================
//  APLICAR ELEMENTOS DINÁMICOS
// ============================================================

function aplicarDinamicos(grupoCopia, jugador, nombrePieza) {

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
                if (itemNombre.typename === "TextFrame") {
                    itemNombre.contents = textoCamiseta;
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
                }
            }
        }
    }

    // ── LOGO ────────────────────────────────────────────────
    var grupoLogo = findGroupByNameRecursivo(dinamico, CONFIG.itemLogo);

    if (grupoLogo) {
        var logoAncho = parseFloat(jugador.LOGO_ANCHO);
        if (!isNaN(logoAncho) && logoAncho > 0) {
            escalarLogoDesdecentro(grupoLogo, logoAncho);
        } else {
            Log.info(
                nombrePieza + " | " + jugador.NOMBRE +
                ": LOGO_ANCHO inválido (" + jugador.LOGO_ANCHO +
                ") — logo no escalado"
            );
        }
    }
}

// ── Determina si una pieza lleva un elemento según el CSV ───
function llevaElemento(jugador, nombrePieza, elemento) {
    if (nombrePieza === "FRENTE") {
        if (elemento === "NOMBRE") return jugador.LLEVA_NOMBRE_F === "SI";
        if (elemento === "NUMERO") return jugador.LLEVA_NUMERO_F === "SI";
    }
    if (nombrePieza === "ESPALDA") {
        if (elemento === "NOMBRE") return jugador.LLEVA_NOMBRE_E === "SI";
        if (elemento === "NUMERO") return jugador.LLEVA_NUMERO_E === "SI";
    }
    if (nombrePieza === "MANGA_IZQ" || nombrePieza === "MANGA_DER") {
        if (elemento === "NOMBRE") return jugador.LLEVA_NOMBRE_E === "SI"; // usa misma bandera espalda
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
//  ESCALA DE GRUPOS
// ============================================================

function scaleGroupExact(grupo, targetAnchoCmd, targetAltoCmd, base) {
    var scaleX = targetAnchoCmd / base.ancho;
    var scaleY = targetAltoCmd  / base.alto;
    var factor = Math.min(scaleX, scaleY);
    var pct    = factor * 100;

    // ── Estrategia segura para escalar dentro del artboard ──
    // 1. Mover la esquina superior-izquierda exactamente al origen [0, 0]
    //    usando left/top (más confiable que position[] para grupos)
    grupo.left = 0;
    grupo.top  = 0;

    // 2. Escalar desde la esquina superior-izquierda del propio grupo
    //    Transformation.TOP_LEFT escala hacia abajo y hacia la derecha,
    //    garantizando que el objeto nunca salga del artboard por arriba/izquierda
    grupo.resize(
        pct, pct,
        true,  // changePositions
        true,  // changeFillPatterns
        true,  // changeFillGradients
        true,  // changeStrokePattern
        pct,   // changeLineWidths
        Transformation.TOPLEFT
    );

    // 3. Volver a anclar en el origen por si resize movió algo
    grupo.left = 0;
    grupo.top  = 0;
}

function escalarLogoDesdecentro(grupoLogo, targetAnchoCmd) {
    var anchoActualCm = ptToCm(Math.abs(grupoLogo.width));
    if (anchoActualCm <= 0) return;

    var factor = (targetAnchoCmd / anchoActualCm) * 100;

    // Calcular centro del grupo
    var bounds  = grupoLogo.geometricBounds;
    var centroX = (bounds[0] + bounds[2]) / 2;
    var centroY = (bounds[1] + bounds[3]) / 2;

    // Escalar desde el centro
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

function getBaseParaPieza(nombrePieza) {
    var key = nombrePieza.toLowerCase();
    return CONFIG.templateBase[key] || CONFIG.templateBase.frente;
}

// ============================================================
//  UTILIDADES DE BÚSQUEDA EN ILLUSTRATOR
// ============================================================

// Busca capa por nombre exacto
function getLayerByName(doc, nombre) {
    for (var i = 0; i < doc.layers.length; i++) {
        if (doc.layers[i].name === nombre) return doc.layers[i];
    }
    return null;
}

// Busca grupo solo en el primer nivel (para grupos de piezas)
function findGroupByNameDirect(parent, nombre) {
    var items = parent.pageItems;
    for (var i = 0; i < items.length; i++) {
        if (items[i].typename === "GroupItem" && items[i].name === nombre) {
            return items[i];
        }
    }
    return null;
}

// Busca grupo de forma recursiva (para DINAMICO, LOGO dentro de piezas)
function findGroupByNameRecursivo(parent, nombre) {
    var items = parent.pageItems;
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (item.typename === "GroupItem") {
            if (item.name === nombre) return item;
            var found = findGroupByNameRecursivo(item, nombre);
            if (found) return found;
        }
    }
    return null;
}

// Busca cualquier item (texto, grupo, path) de forma recursiva
function findItemByNameRecursivo(parent, nombre) {
    var items = parent.pageItems;
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (item.name === nombre) return item;
        if (item.typename === "GroupItem") {
            var found = findItemByNameRecursivo(item, nombre);
            if (found) return found;
        }
    }
    return null;
}

// Devuelve TODOS los grupos con ese nombre (para detectar duplicados)
function findAllGroupsByName(parent, nombre) {
    var resultados = [];
    var items = parent.pageItems;
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (item.typename === "GroupItem") {
            if (item.name === nombre) resultados.push(item);
            // Solo busca en primer nivel para detección de duplicados
        }
    }
    return resultados;
}

// Devuelve todos los items con ese nombre (para detectar duplicados)
function findAllItemsByName(parent, nombre) {
    var resultados = [];
    var items = parent.pageItems;
    for (var i = 0; i < items.length; i++) {
        if (items[i].name === nombre) resultados.push(items[i]);
    }
    return resultados;
}

// ============================================================
//  DOCUMENTO NUEVO
// ============================================================

function crearDocumentoNuevo() {
    // DocumentPreset con ancho del plóter en CMYK
    // DocumentColorMode no está disponible en todas las versiones de Illustrator
    // Se usa el string "CMYK" directamente como perfil de color
    var anchoPlotterPt = CONFIG.ploterAncho * CM_TO_PT;
    var altoInicialPt  = 200 * CM_TO_PT; // crece dinámicamente hacia abajo

    var doc = app.documents.add(
        DocumentColorSpace.CMYK,  // espacio de color CMYK
        anchoPlotterPt,           // ancho en puntos
        altoInicialPt,            // alto inicial en puntos
        1,                        // número de artboards
        DocumentArtboardLayout.Row,
        0,
        1
    );
    return doc;
}

// ============================================================
//  UTILIDADES GENERALES
// ============================================================

function trim(str) {
    if (!str) return "";
    return (str + "").replace(/^\s+|\s+$/g, "");
}

function sanitizar(str) {
    return (str + "").replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_\-]/g, "_");
}

function ptToCm(pt) {
    return pt / CM_TO_PT;
}

function cmToPt(cm) {
    return cm * CM_TO_PT;
}

function getTimestamp() {
    var f = new Date();
    return f.getFullYear() +
           ("0" + (f.getMonth() + 1)).slice(-2) +
           ("0" + f.getDate()).slice(-2) + "_" +
           ("0" + f.getHours()).slice(-2) +
           ("0" + f.getMinutes()).slice(-2) +
           ("0" + f.getSeconds()).slice(-2);
}

function decodificarXml(str) {
    if (!str) return "";
    return str
        .replace(/&amp;/g,  "&")
        .replace(/&lt;/g,   "<")
        .replace(/&gt;/g,   ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

function limpiarCarpeta(folder) {
    var files = folder.getFiles();
    for (var i = 0; i < files.length; i++) {
        if (files[i] instanceof Folder) {
            limpiarCarpeta(files[i]);
            files[i].remove();
        } else {
            files[i].remove();
        }
    }
}

// ─── PUNTO DE ENTRADA ────────────────────────────────────────
main();