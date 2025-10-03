// Script Illustrator (.jsx) - Duplicar grupo FRENTE según tallas aproximadas, escala proporcional

function main() {
    var doc = app.activeDocument;

    // Datos de jugadores con tallas
    var jugadores = [
        {nombre: "Juan", numero: 10, talla: "30H"}
    ];

    // Tabla de tallas en cm
    var tallas = {
        "24": {alto: 45, ancho: 32},
        "26": {alto: 48, ancho: 34.5},
        "28": {alto: 50.5, ancho: 36.5},
        "30": {alto: 54, ancho: 38},
        "32": {alto: 62, ancho: 41.5},
        "34": {alto: 69, ancho: 43.5},
        "35": {alto: 74, ancho: 46},
        "36": {alto: 76, ancho: 51},
        "38": {alto: 79, ancho: 52.5},
        "40": {alto: 81, ancho: 55.5},
        "42": {alto: 82.5, ancho: 58.3},
        "44": {alto: 85.5, ancho: 61},
        "46": {alto: 90.5, ancho: 63.2}
    };

    var CM_TO_PT = 28.3464567;

    // Crear log con fecha/hora
    var fecha = new Date();
    var timestamp = fecha.getFullYear() + 
                    ("0" + (fecha.getMonth()+1)).slice(-2) +
                    ("0" + fecha.getDate()).slice(-2) + "_" +
                    ("0" + fecha.getHours()).slice(-2) +
                    ("0" + fecha.getMinutes()).slice(-2) +
                    ("0" + fecha.getSeconds()).slice(-2);
    var logFile = new File("~/Documents/Sublimania/logs/log_camisetas_" + timestamp + ".txt");
    logFile.open("w");
    logFile.writeln("=== Inicio del script ===");
    logFile.writeln("Documento: " + doc.name);

    // Buscar grupo por nombre dentro de un layer
    function findGroupByName(parent, name) {
        for (var i = 0; i < parent.pageItems.length; i++) {
            var item = parent.pageItems[i];
            if (item.typename === "GroupItem" && item.name === name) {
                return item;
            }
        }
        return null;
    }
    
function scaleGroupExact(group, targetWidthCm, targetHeightCm, logFile) {
    var CM_TO_PT = 28.3464567;
    var targetWidthPt  = targetWidthCm * CM_TO_PT;
    var targetHeightPt = targetHeightCm * CM_TO_PT;

    // Dimensiones reales del grupo en Illustrator
    var currentWidth  = group.width;   // ancho en pts
    var currentHeight = group.height;  // alto en pts

    logFile.writeln("=== Escalado Detallado ===");
    logFile.writeln("Grupo: " + group.name);

    // Dimensiones actuales
    logFile.writeln("Dimensiones actuales (pt) -> ancho: " + currentWidth.toFixed(2) + ", alto: " + currentHeight.toFixed(2));
    logFile.writeln("Dimensiones actuales (cm) -> ancho: " + (currentWidth/CM_TO_PT).toFixed(4) + ", alto: " + (currentHeight/CM_TO_PT).toFixed(4));

    // Dimensiones objetivo
    logFile.writeln("Dimensiones objetivo (pt) -> ancho: " + targetWidthPt.toFixed(2) + ", alto: " + targetHeightPt.toFixed(2));
    logFile.writeln("Dimensiones objetivo (cm) -> ancho: " + targetWidthCm.toFixed(4) + ", alto: " + targetHeightCm.toFixed(4));

    // Factores de escala por eje
    var scaleX = targetWidthPt / currentWidth;
    var scaleY = targetHeightPt / currentHeight;

    logFile.writeln("Factor de escala por ancho: " + scaleX.toFixed(4) + " (" + (scaleX*100).toFixed(2) + "%)");
    logFile.writeln("Factor de escala por alto: " + scaleY.toFixed(4) + " (" + (scaleY*100).toFixed(2) + "%)");

    // Escalado proporcional: usamos el menor factor para no deformar
    var scaleFactor = Math.min(scaleX, scaleY);
    logFile.writeln("Factor de escala final aplicado (proporcional): " + scaleFactor.toFixed(4) + " (" + (scaleFactor*100).toFixed(2) + "%)");

    group.resize(scaleFactor*100, scaleFactor*100);

    // Dimensiones finales
    var newWidth  = group.width;
    var newHeight = group.height;

    logFile.writeln("Dimensiones finales (pt) -> ancho: " + newWidth.toFixed(2) + ", alto: " + newHeight.toFixed(2));
    logFile.writeln("Dimensiones finales (cm) -> ancho: " + (newWidth/CM_TO_PT).toFixed(4) + ", alto: " + (newHeight/CM_TO_PT).toFixed(4));

    logFile.writeln("=============================\n");
}








    try {
        var templateLayer;
        try {
            templateLayer = doc.layers.getByName("TEMPLATE");
            logFile.writeln("Capa TEMPLATE encontrada ✅");
        } catch(e) {
            logFile.writeln("Error: no se encontró la capa TEMPLATE");
            return;
        }

        var baseGroup = findGroupByName(templateLayer, "FRENTE");
        if (!baseGroup) {
            logFile.writeln("Error: grupo FRENTE no encontrado dentro de TEMPLATE");
            return;
        }
        logFile.writeln("Grupo FRENTE encontrado: " + baseGroup.name);

        // Recorrer jugadores
        for (var i = 0; i < jugadores.length; i++) {
            var j = jugadores[i];
            try {
                var tallaNum = j.talla.match(/\d+/)[0];
                if (!tallas[tallaNum]) {
                    logFile.writeln("Error: talla " + j.talla + " no definida en la tabla de tallas");
                    continue;
                }

                var dims = tallas[tallaNum];
                var copia = baseGroup.duplicate();
                copia.name = "FRENTE_" + j.nombre + "_" + j.numero + "_" + j.talla;

                // Escalar proporcionalmente
                scaleGroupExact(copia, dims.ancho, dims.alto, logFile);
           
                logFile.writeln(
                    "Grupo duplicado: " + copia.name +
                    ", dimensiones aproximadas (cm) - ancho máximo: " + dims.ancho + ", alto máximo: " + dims.alto
                );

            } catch(e) {
                logFile.writeln("Error duplicando grupo para " + j.nombre + ": " + e.message);
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

main();
