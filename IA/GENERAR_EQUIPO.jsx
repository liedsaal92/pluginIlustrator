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

    // 6. Crear capa GENERADO dentro del mismo documento
    //    Si ya existe de una ejecución anterior, la eliminamos y recreamos
    var capaGenerado;
    try {
        capaGenerado = doc.layers.getByName("GENERADO");
        // Eliminar todos los items de la capa anterior
        while (capaGenerado.pageItems.length > 0) {
            capaGenerado.pageItems[0].remove();
        }
        capaGenerado.locked = false;
        Log._linea("-----", "Capa GENERADO existente limpiada");
    } catch(e) {
        capaGenerado = doc.layers.add();
        capaGenerado.name = "GENERADO";
        Log._linea("-----", "Capa GENERADO creada");
    }

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

    // 8. Procesar piezas
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

                // Medir dimensiones reales del template en este momento.
                // Si el grupo tiene clip mask, medimos el clip path (evita que
                // contenido que desborda el clip infle las dimensiones).
                // Si no tiene clip, .width/.height del grupo es suficiente.
                var base;
                var _clipBounds = null;
                if (grupoTemplate.clipped) {
                    for (var _ci = 0; _ci < grupoTemplate.pageItems.length; _ci++) {
                        try {
                            if (grupoTemplate.pageItems[_ci].clipping === true) {
                                _clipBounds = grupoTemplate.pageItems[_ci].geometricBounds;
                                break;
                            }
                        } catch (_e) {}
                    }
                }
                if (_clipBounds) {
                    // geometricBounds = [top, left, bottom, right] en puntos (coords doc)
                    base = {
                        ancho: ptToCm(Math.abs(_clipBounds[3] - _clipBounds[1])),
                        alto:  ptToCm(Math.abs(_clipBounds[0] - _clipBounds[2]))
                    };
                } else {
                    base = {
                        ancho: ptToCm(Math.abs(grupoTemplate.width)),
                        alto:  ptToCm(Math.abs(grupoTemplate.height))
                    };
                }
                if (i === 0) {
                    Log._linea("-----", nombrePieza + " base medida: " +
                        base.ancho.toFixed(2) + " x " + base.alto.toFixed(2) + " cm");
                }

                // Escalar — capturar el factor real aplicado
                var factorPieza = scaleGroupExact(copia, dims.ancho, dims.alto, base);

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
