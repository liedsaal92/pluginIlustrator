function loadCSV(path, logFile) {
    var file = new File(path);
    if (!file.exists) {
        alert("No se encontró el archivo CSV: " + path);
        if (logFile) logFile.writeln("No se encontró el archivo CSV: " + path);
        return [];
    }

    file.open("r");
    var content = file.read();
    file.close();

    if (logFile) logFile.writeln("Archivo CSV leído correctamente: " + path);

    var lines = content.split("\n");
    if (lines.length < 2) {
        if (logFile) logFile.writeln("El archivo CSV no tiene suficientes líneas para procesar.");
        return [];
    }

    var headers = lines[0].split(",");
    if (logFile) logFile.writeln("Cabeceras encontradas: " + headers.join(", "));

    var data = [];

    for (var i = 1; i < lines.length; i++) {
        var line = lines[i].replace(/^\s+|\s+$/g, "");
        if (line === "") {
            if (logFile) logFile.writeln("    Línea " + i + " está vacía, se omite.");
            continue;
        }

        var values = line.split(",");
        var obj = {};
        if (logFile) logFile.writeln("Procesando línea " + i + ":");

        for (var j = 0; j < headers.length; j++) {
            var key = headers[j].replace(/^\s+|\s+$/g, "").toUpperCase();
            var val = values[j] ? values[j].replace(/^\s+|\s+$/g, "") : "";

            // Convertir a número si corresponde
            if (key === "NUMERO" || key === "ALTO" || key === "ANCHO") {
                val = parseFloat(val);
                if (isNaN(val)) {
                    if (logFile) logFile.writeln("    ⚠ Valor numérico inválido para " + key + ", se asigna 0");
                    val = 0;
                }
            }

            obj[key] = val;

            if (logFile) logFile.writeln("    " + key + ": " + val);
        }

        data.push(obj);
    }

    if (logFile) logFile.writeln("Se cargaron " + data.length + " registros desde el CSV.");
    return data;
}


function main() {
    var doc = app.activeDocument;
    // BASE de referencia (hardcode)
    var templateBase = {ancho: 42, alto: 59}; // en cm
    // Crear log con fecha/hora
    var fecha = new Date();
    var timestamp = fecha.getFullYear() + 
                    ("0" + (fecha.getMonth()+1)).slice(-2) +
                    ("0" + fecha.getDate()).slice(-2) + "_" +
                    ("0" + fecha.getHours()).slice(-2) +
                    ("0" + fecha.getMinutes()).slice(-2) +
                    ("0" + fecha.getSeconds()).slice(-2);
    var logFile = new File("~/Documents/Sublimania/logs/log_camisetas_" + timestamp + ".txt");

    // Datos de jugadores con tallas
    var csvPath = "~/Downloads/EQUIPO.csv"; 
    var jugadores = loadCSV(csvPath, logFile);

    var CM_TO_PT = 28.3464567;

    
    
    logFile.open("w");
    logFile.writeln("=== Inicio del script ===");
    logFile.writeln("Documento: " + doc.name);

    try {
        var templateLayer;
        try {
            templateLayer = doc.layers.getByName("TEMPLATE");
            logFile.writeln("Capa TEMPLATE encontrada ✅");
        } catch(e) {
            logFile.writeln("Error: no se encontró la capa TEMPLATE");
            return;
        }

        var frenteGroup = findGroupByName(templateLayer, "FRENTE");
        if (!frenteGroup) {
            logFile.writeln("Error: grupo FRENTE no encontrado");
            return;
        }

        var offsetX = 0;
        var offsetY = 0;
        var gapX = 20; // separación horizontal
        var gapY = 5;  // más ajustado verticalmente
        var filaMaxHeight = 0;

        for (var i = 0; i < jugadores.length; i++) {
            var j = jugadores[i];
            var dims = { ancho: j.ANCHO, alto: j.ALTO };

            var frenteCopia = frenteGroup.duplicate(app.activeDocument, ElementPlacement.PLACEATEND);
            scaleGroupExact(frenteCopia, dims.ancho, dims.alto, templateBase, logFile);

            // Medimos la altura real de la camiseta
            var frenteHeight = frenteCopia.height;

            // Agrupar
            var grupoFinal = app.activeDocument.groupItems.add();
            frenteCopia.moveToBeginning(grupoFinal);
            grupoFinal.name = "FRENTE_" + j.NOMBRE + "_" + j.NUMERO + "_" + j.TALLA;

            // Posicionar
            grupoFinal.position = [offsetX, offsetY];

            // Actualizamos el alto de fila usando la altura real de la camiseta
            filaMaxHeight = Math.max(filaMaxHeight, frenteHeight);

            // Avanzamos X
            offsetX += grupoFinal.width + gapX;

            // Salto de fila si se sale del artboard
            if (offsetX + grupoFinal.width > doc.width) {
                offsetX = 0;
                offsetY -= filaMaxHeight + gapY;
                filaMaxHeight = 0; // reset alto de fila
            }

        }
        logFile.writeln("=== Script finalizado correctamente ✅ ===");

    } catch(e) {
        logFile.writeln("Error general del script: " + e.message);
    } finally {
        logFile.close();
    }

    alert("Se generaron las camisetas automáticamente. Log creado en el escritorio ✅");
}

// Conversión
function pointsToCm(points) { return points / 28.3464567; }
function cmToPoints(cm) { return cm * 28.3464567; }

// Buscar grupo
function findGroupByName(parent, name) {
    for (var i = 0; i < parent.pageItems.length; i++) {
        var item = parent.pageItems[i];
        if (item.typename === "GroupItem" && item.name === name) return item;
    }
    return null;
}

// Buscar item dentro de grupo
function findItemByName(parent, name) {
    for (var i = 0; i < parent.pageItems.length; i++) {
        var item = parent.pageItems[i];
        if (item.name === name) return item;
        if (item.typename === "GroupItem") {
            var found = findItemByName(item, name);
            if (found) return found;
        }
    }
    return null;
}

function scaleGroupExact(group, targetWidthCm, targetHeightCm, templateBase, logFile) {
    var CM_TO_PT = 28.3464567;

    // Convertir a puntos
    var targetWidthPt = targetWidthCm * CM_TO_PT;
    var targetHeightPt = targetHeightCm * CM_TO_PT;
    var baseWidthPt   = templateBase.ancho * CM_TO_PT;
    var baseHeightPt  = templateBase.alto * CM_TO_PT;

    // Factor de escala proporcional
    var scaleX = targetWidthPt / baseWidthPt;
    var scaleY = targetHeightPt / baseHeightPt;
    var scaleFactor = Math.min(scaleX, scaleY);

    if (logFile) {
        logFile.writeln("Escalando grupo " + group.name);
        logFile.writeln("Dimensiones objetivo (cm) -> ancho: " + targetWidthCm + ", alto: " + targetHeightCm);
        logFile.writeln("Factor de escala final: " + (scaleFactor*100).toFixed(2) + "%");
    }

    // Aplicar escala
    group.resize(scaleFactor*100, scaleFactor*100);
}


// Posiciona un grupo con opción a rotarlo 90° si no cabe en la fila
function placeGroupWithRotation(group, doc, offsets, gapX, gapY) {
    var bounds = group.visibleBounds;
    var gWidth = bounds[2] - bounds[0];
    var gHeight = bounds[1] - bounds[3];

    // Si no cabe horizontal, intentamos rotar 90°
    if (offsets.x + gWidth > doc.width) {
        group.rotate(90);
        bounds = group.visibleBounds;
        gWidth = bounds[2] - bounds[0];
        gHeight = bounds[1] - bounds[3];
    }

    // Si aún no cabe -> salto de fila
    if (offsets.x + gWidth > doc.width) {
        offsets.x = 0;
        offsets.y -= offsets.rowHeight + gapY;
        offsets.rowHeight = 0;
    }

    // Colocar en posición
    group.left = offsets.x - bounds[0];
    group.top = offsets.y - bounds[1];

    // Avanzar posición
    offsets.x += gWidth + gapX;
    if (gHeight > offsets.rowHeight) {
        offsets.rowHeight = gHeight;
    }
}

main();
