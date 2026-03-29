// ============================================================
//  ai_utils.jsx
//  Utilidades de búsqueda y manipulación de objetos en Illustrator
// ============================================================

// Desbloquea recursivamente todos los items de un contenedor
function desbloquearTodo(parent) {
    try {
        var items = parent.pageItems;
        for (var i = 0; i < items.length; i++) {
            try {
                items[i].locked = false;
                if (items[i].typename === "GroupItem") {
                    desbloquearTodo(items[i]);
                }
            } catch(e) { /* ignorar items que no admiten unlock */ }
        }
    } catch(e) {}
}

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
