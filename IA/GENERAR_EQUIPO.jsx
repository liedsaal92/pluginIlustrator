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

#include "lib/config.jsx";
#include "lib/log.jsx";
#include "lib/utils.jsx";
#include "lib/ai_utils.jsx";
#include "lib/csv_reader.jsx";
#include "lib/template_validator.jsx";
#include "lib/escala.jsx";
#include "lib/posicionamiento.jsx";
#include "lib/procesadores.jsx";
#include "lib/dinamicos.jsx";

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

    // ── Ventana de progreso ──────────────────────────────────
    var progWin = new Window("palette", "Sublimania — Generando equipo", undefined, {closeButton: false});
    progWin.orientation = "column";
    progWin.alignChildren = "fill";
    progWin.margins = [20, 16, 20, 16];
    progWin.spacing = 10;

    var stTitulo = progWin.add("statictext", undefined, doc.name);
    stTitulo.graphics.font = ScriptUI.newFont("dialog", "BOLD", 11);

    var stEstado = progWin.add("statictext", undefined, "Leyendo CSV...");
    stEstado.preferredSize.width = 380;

    var pb = progWin.add("progressbar", undefined, 0, 100);
    pb.preferredSize = [380, 14];

    var stDetalle = progWin.add("statictext", undefined, " ");
    stDetalle.preferredSize.width = 380;

    progWin.show();

    function progActualizar(estado, detalle, valor) {
        stEstado.text  = estado  || stEstado.text;
        stDetalle.text = detalle || " ";
        if (typeof valor === "number") pb.value = valor;
        progWin.update();
    }
    // ────────────────────────────────────────────────────────

    Log._linea("-----", "Documento : " + doc.name);
    Log._linea("-----", "CSV       : " + csvFile.fsName);

    // 4. Leer CSV
    progActualizar("Leyendo CSV...", csvFile.name, 5);
    var jugadores = leerXlsx(csvFile);
    if (jugadores === null || jugadores.length === 0) {
        progWin.close();
        Log.fatal("No se encontraron jugadores válidos en el CSV");
        var lp = Log.exportar(logFolder.fsName);
        alert("ERROR FATAL: No hay jugadores válidos.\nRevisa el log: " + lp);
        return;
    }
    Log._linea("-----", "Jugadores : " + jugadores.length);

    // 5. Validar plantilla ANTES de modificar nada
    progActualizar("Validando plantilla...", doc.name, 15);
    var validacion = validarPlantilla(doc);
    if (!validacion.ok) {
        progWin.close();
        Log.fatal(validacion.mensaje);
        var lp = Log.exportar(logFolder.fsName);
        alert("ERROR FATAL: " + validacion.mensaje + "\n\nRevisa el log: " + lp);
        return;
    }

    var gruposDisponibles = validacion.grupos;
    Log._linea("-----", "Piezas    : " + gruposDisponibles.nombres.join(", "));

    // 6. Crear capa GENERADO_<tallas> nueva — nunca sobreescribir ejecuciones anteriores
    var _tallasVistas = {};
    var _tallasOrden  = [];
    for (var _ti = 0; _ti < jugadores.length; _ti++) {
        var _talla = trim(jugadores[_ti].TALLA + "");
        if (_talla !== "" && !_tallasVistas[_talla]) {
            _tallasVistas[_talla] = true;
            _tallasOrden.push(_talla);
        }
    }
    var _nombreBase = "GENERADO" +
                      (_tallasOrden.length > 0 ? "_" + _tallasOrden.join("_") : "");

    // Si ya existe una capa con ese nombre, agregar sufijo _2, _3, ...
    var _nombreCapa = _nombreBase;
    var _intento    = 2;
    while (_intento <= 99) {
        try {
            doc.layers.getByName(_nombreCapa);
            _nombreCapa = _nombreBase + "_" + _intento;
            _intento++;
        } catch(e) {
            break;
        }
    }

    var capaGenerado = doc.layers.add();
    capaGenerado.name = _nombreCapa;
    Log._linea("-----", "Capa '" + _nombreCapa + "' creada");

    // Mover GENERADO al frente (encima de TEMPLATE)
    capaGenerado.zOrder(ZOrderMethod.BRINGTOFRONT);

    // 7. Desbloquear TEMPLATE y todos sus items recursivamente
    //    y ocultarla durante el proceso para no confundir visualmente
    var templateLayer   = validacion.templateLayer;
    var templateVisible = templateLayer.visible;
    var templateLocked  = templateLayer.locked;
    templateLayer.locked  = false;
    desbloquearTodo(templateLayer);   // desbloquea sublayers y grupos anidados
    templateLayer.visible = false;

    // 8. Detectar la talla del template comparando la base de FRENTE con el CSV.
    //    Si FRENTE tiene clip mask, sus bounds revelan a qué talla fue diseñado el .ai.
    //    Ese mismo jugador/talla se usa para deducir las dimensiones base de MANGA_IZQ/DER
    //    cuando esos grupos no tienen clip mask propio.
    var _tallaTemplate = detectarTallaTemplate(jugadores, gruposDisponibles);

    // 9. Procesar piezas
    var docAncho   = doc.width;
    var currentY   = 0;
    var totalPasos = jugadores.length * CONFIG.piezas.length;
    var pasoActual = 0;

    for (var p = 0; p < CONFIG.piezas.length; p++) {
        var nombrePieza   = CONFIG.piezas[p];
        var grupoTemplate = gruposDisponibles.grupos[nombrePieza];

        if (!grupoTemplate) {
            Log.info("Pieza '" + nombrePieza + "' no encontrada en plantilla — omitida");
            pasoActual += jugadores.length;
            continue;
        }

        Log._linea("-----", "");
        Log._linea("-----", "=== " + nombrePieza + " ===");

        // Pre-calcular base UNA VEZ por pieza leyendo ESTATICO directamente del template.
        // ESTATICO es la silueta del molde → es la fuente de verdad para las dimensiones.
        // Prioridad:
        //   1. ESTATICO presente → bounds exactos del subgrupo ESTATICO
        //   2. Manga sin ESTATICO + talla detectada desde FRENTE → dims del CSV de esa talla
        //   3. Fallback: bounding box completo del grupo
        var basePieza;
        var _estaticoTemplate = findGroupByNameRecursivo(grupoTemplate, "ESTATICO");
        if (_estaticoTemplate) {
            var _eb = _estaticoTemplate.geometricBounds; // [left, top, right, bottom]
            basePieza = {
                ancho: ptToCm(Math.abs(_eb[2] - _eb[0])),
                alto:  ptToCm(Math.abs(_eb[1] - _eb[3]))
            };
            Log.ok(nombrePieza + ": base desde ESTATICO → " +
                   basePieza.ancho.toFixed(2) + " x " + basePieza.alto.toFixed(2) + " cm");
        } else if ((nombrePieza === "MANGA_IZQ" || nombrePieza === "MANGA_DER") && _tallaTemplate) {
            basePieza = {
                ancho: parseFloat(_tallaTemplate.MANGA_ANCHO),
                alto:  parseFloat(_tallaTemplate.MANGA_ALTO)
            };
            Log.ok(nombrePieza + ": base deducida de talla template (" +
                   _tallaTemplate.TALLA + ") → " +
                   basePieza.ancho.toFixed(2) + " x " + basePieza.alto.toFixed(2) + " cm");
        } else {
            basePieza = {
                ancho: ptToCm(Math.abs(grupoTemplate.width)),
                alto:  ptToCm(Math.abs(grupoTemplate.height))
            };
            Log.info(nombrePieza + ": base desde grupo completo (sin ESTATICO) → " +
                     basePieza.ancho.toFixed(2) + " x " + basePieza.alto.toFixed(2) + " cm");
        }
        Log._linea("-----", nombrePieza + " base medida: " +
            basePieza.ancho.toFixed(2) + " x " + basePieza.alto.toFixed(2) + " cm");

        var offsetX       = 0;
        var filaMaxHeight = 0;

        for (var i = 0; i < jugadores.length; i++) {
            var j = jugadores[i];

            pasoActual++;
            var progValor = 20 + Math.round((pasoActual / totalPasos) * 75);
            progActualizar(
                nombrePieza + "  (" + pasoActual + "/" + totalPasos + ")",
                j.NOMBRE + "  —  " + j.TALLA,
                progValor
            );

            try {
                var dims = getDimensiones(j, nombrePieza);
                if (!dims) {
                    Log.error(nombrePieza + " | " + j.NOMBRE + ": dimensiones inválidas — omitido");
                    continue;
                }

                // Duplicar a capa GENERADO
                var copia = grupoTemplate.duplicate(capaGenerado, ElementPlacement.PLACEATEND);

                // Escalar — ESTATICO primero, DINAMICO proporcional
                var factorPieza = scalePiezaExact(copia, dims.ancho, dims.alto, basePieza);

                // Aplicar dinámicos pasando el factor para compensar en líneas
                aplicarDinamicos(copia, j, nombrePieza, factorPieza);

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

    // 9. Restaurar estado original de TEMPLATE
    templateLayer.visible = templateVisible;
    templateLayer.locked  = templateLocked;

    // 10. Log y resumen
    progActualizar("Exportando log...", " ", 98);
    var logPath = Log.exportar(logFolder.fsName);

    progWin.close();

    alert(
        "Proceso completado\n\n" +
        "OK     : " + Log.resumen.ok     + " piezas\n" +
        "INFO   : " + Log.resumen.info   + " omisiones\n" +
        "ERROR  : " + Log.resumen.error  + " errores\n\n" +
        "Las piezas están en la capa GENERADO\n" +
        "Log: " + logPath
    );
}

// ─── PUNTO DE ENTRADA ────────────────────────────────────────
main();
