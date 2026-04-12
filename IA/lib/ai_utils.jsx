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

// Busca el primer TextFrame dentro de un item (incluye envolventes y grupos)
function findTextFrameRecursivo(item) {
    if (!item) return null;
    if (item.typename === "TextFrame") return item;
    try {
        if (item.pageItems && item.pageItems.length > 0) {
            for (var i = 0; i < item.pageItems.length; i++) {
                var found = findTextFrameRecursivo(item.pageItems[i]);
                if (found) return found;
            }
        }
    } catch(e) {}
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
//  CLIP MASK AUTOMÁTICO PARA MANGAS
// ============================================================

// Devuelve los geometricBounds del clip path directo de un grupo, o null si no tiene.
function buscarClipBounds(grupo) {
    if (!grupo.clipped) return null;
    for (var _k = 0; _k < grupo.pageItems.length; _k++) {
        try {
            if (grupo.pageItems[_k].clipping === true) {
                return grupo.pageItems[_k].geometricBounds;
            }
        } catch (_e) {}
    }
    return null;
}

// Acumula el PathItem/CompoundPathItem de mayor bounding box en un contenedor,
// buscando recursivamente dentro de sub-grupos.
function _buscarMayorPath(parent, ref) {
    for (var _i = 0; _i < parent.pageItems.length; _i++) {
        var _item = parent.pageItems[_i];
        var _t    = _item.typename;
        if (_t === "PathItem" || _t === "CompoundPathItem") {
            try {
                var _b    = _item.geometricBounds;
                var _area = Math.abs(_b[3] - _b[1]) * Math.abs(_b[0] - _b[2]);
                if (_area > ref.area) { ref.area = _area; ref.item = _item; }
            } catch(_e) {}
        } else if (_t === "GroupItem") {
            _buscarMayorPath(_item, ref);
        }
    }
}

// Busca el path de silueta de una manga: el PathItem/CompoundPathItem con mayor
// área de bounding box dentro de ESTATICO (o del grupo completo si no hay ESTATICO).
// Ese path es casi siempre la silueta exterior de la manga.
function encontrarSiluetaManga(grupo) {
    var contenedor = findGroupByNameRecursivo(grupo, "ESTATICO") || grupo;
    var ref = { item: null, area: 0 };
    _buscarMayorPath(contenedor, ref);
    return ref.item;
}

// Aplica un clip mask automático al grupo de manga si no tiene uno.
// Duplica el path de silueta y lo coloca al frente del grupo como clip.
// Modifica el grupoTemplate en el documento — el cambio persiste en el .ai.
function asegurarClipMask(grupo, nombrePieza) {
    if (grupo.clipped) {
        Log.info(nombrePieza + ": ya tiene clip mask — no se modifica");
        return;
    }
    // Desbloquear el grupo completo antes de buscar y duplicar
    try { grupo.locked = false; } catch(e) {}
    desbloquearTodo(grupo);

    var silueta = encontrarSiluetaManga(grupo);
    if (!silueta) {
        Log.info(nombrePieza + ": no se encontró path de silueta para clip mask automático");
        return;
    }
    try {
        try { silueta.locked = false; } catch(e) {}
        var clip = silueta.duplicate(grupo, ElementPlacement.PLACEATBEGINNING);
        try { clip.filled  = false; } catch(e) {}
        try { clip.stroked = false; } catch(e) {}
        grupo.clipped = true;
        Log.ok(nombrePieza + ": clip mask automático aplicado desde silueta en ESTATICO");
    } catch(e) {
        Log.info(nombrePieza + ": error al crear clip mask (" + e.message + ") — continuando sin clip");
    }
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
