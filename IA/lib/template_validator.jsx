// ============================================================
//  template_validator.jsx
//  Validación de la estructura de la plantilla .ai
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

            // Diagnóstico adicional: mostrar contenido de DINAMICO si existe
            var dinamicoDiag = findGroupByNameDirect(grupo, "DINAMICO");
            if (dinamicoDiag) {
                var dinMsg = "  Items en " + nombre + "/DINAMICO: ";
                for (var dd = 0; dd < dinamicoDiag.pageItems.length; dd++) {
                    dinMsg += "[" + dinamicoDiag.pageItems[dd].typename +
                              " '" + dinamicoDiag.pageItems[dd].name + "'] ";
                }
                Log._linea("DIAG ", dinMsg);
            }

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

    // 4. Verificar duplicados dentro de cada pieza
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

// Detecta la talla del template comparando las dimensiones de FRENTE
// con los datos del CSV. Devuelve el objeto jugador que mejor coincide
// (diferencia < 2cm) o null si no se puede determinar.
function detectarTallaTemplate(jugadores, gruposDisponibles) {
    var tallaTemplate = null;
    var frenteGrupo   = gruposDisponibles.grupos["FRENTE"];
    if (!frenteGrupo) return null;

    var fcb    = buscarClipBounds(frenteGrupo);
    var fAncho = fcb
        ? ptToCm(Math.abs(fcb[3] - fcb[1]))
        : ptToCm(Math.abs(frenteGrupo.width));
    var fAlto  = fcb
        ? ptToCm(Math.abs(fcb[0] - fcb[2]))
        : ptToCm(Math.abs(frenteGrupo.height));

    var mejorDiff = 999;
    for (var ti = 0; ti < jugadores.length; ti++) {
        var tj   = jugadores[ti];
        var ta   = parseFloat(tj.ANCHO);
        var th   = parseFloat(tj.ALTO);
        if (isNaN(ta) || isNaN(th)) continue;
        var diff = Math.abs(ta - fAncho) + Math.abs(th - fAlto);
        if (diff < mejorDiff) { mejorDiff = diff; tallaTemplate = tj; }
    }
    if (tallaTemplate && mejorDiff < 2) {
        Log.ok("Template detectado: talla " + tallaTemplate.TALLA +
               " (" + fAncho.toFixed(1) + " x " + fAlto.toFixed(1) + " cm)");
    } else {
        tallaTemplate = null;
        Log.info("No se pudo detectar talla del template desde FRENTE");
    }
    return tallaTemplate;
}
