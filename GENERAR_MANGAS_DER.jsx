// Script Illustrator (.jsx) - Duplicar grupo FRENTE según tallas aproximadas, escala proporcional

function main() {
    var doc = app.activeDocument;

    // Datos de jugadores con tallas
    var jugadores = [
    // Hombres
    {nombre: "Juan", numero: 10, talla: "24H"},
    {nombre: "Raúl", numero: 18, talla: "38H"},
    {nombre: "Héctor", numero: 19, talla: "40H"},
    {nombre: "Sergio", numero: 20, talla: "42H"},
    {nombre: "Alberto", numero: 21, talla: "44H"},

    // Mujeres
    {nombre: "Ana", numero: 1, talla: "24M"},
    {nombre: "María", numero: 2, talla: "26M"},
    {nombre: "Gabriela", numero: 10, talla: "40M"},
    {nombre: "Carolina", numero: 11, talla: "42M"},
    {nombre: "Fernanda", numero: 12, talla: "44M"}
];


    // BASE de referencia (hardcode)
    var templateBase = {ancho: 42, alto: 59}; // en cm

    // Tabla de tallas en cm
   var tallas = {
    // HOMBRES
    "24H": {alto: 47.00, ancho: 34.50},
    "26H": {alto: 50.82, ancho: 37.16},
    "28H": {alto: 54.64, ancho: 39.82},
    "30H": {alto: 58.46, ancho: 42.48},
    "32H": {alto: 62.28, ancho: 45.14},
    "34H": {alto: 66.10, ancho: 47.80},
    "35H": {alto: 69.92, ancho: 50.46},
    "36H": {alto: 73.74, ancho: 53.12},
    "38H": {alto: 77.56, ancho: 55.78},
    "40H": {alto: 81.38, ancho: 58.44},
    "42H": {alto: 85.20, ancho: 61.10},
    "44H": {alto: 89.00, ancho: 63.76},
    
    // MUJERES
    "24M": {alto: 45.00, ancho: 34.50},
    "26M": {alto: 48.20, ancho: 36.88},
    "28M": {alto: 51.40, ancho: 39.26},
    "30M": {alto: 54.60, ancho: 41.64},
    "32M": {alto: 57.80, ancho: 44.02},
    "34M": {alto: 61.00, ancho: 46.40},
    "35M": {alto: 64.20, ancho: 48.78},
    "36M": {alto: 67.40, ancho: 51.16},
    "38M": {alto: 70.60, ancho: 53.54},
    "40M": {alto: 73.80, ancho: 55.92},
    "42M": {alto: 77.00, ancho: 58.30},
    "44M": {alto: 80.00, ancho: 60.68}
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
            var tallaNum = j.talla; 
            if (!tallas[tallaNum]) continue;
            var dims = tallas[tallaNum];

            var frenteCopia = frenteGroup.duplicate(app.activeDocument, ElementPlacement.PLACEATEND);
            scaleGroupExact(frenteCopia, dims.ancho, dims.alto, templateBase, logFile);

            // Medimos la altura real de la camiseta
            var frenteHeight = frenteCopia.height;

            // Agrupar
            var grupoFinal = app.activeDocument.groupItems.add();
            frenteCopia.moveToBeginning(grupoFinal);
            grupoFinal.name = "FRENTE_" + j.nombre + "_" + j.numero + "_" + j.talla;

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

// Escalar grupo proporcionalmente según templateBase
function scaleGroupExact(group, targetWidthCm, targetHeightCm, templateBase, logFile) {
    var CM_TO_PT = 28.3464567;
    // Añadir 1 cm al alto
    
    // Escala respecto a templateBase
    var scaleX = (targetWidthCm + .5) / templateBase.ancho;
    var scaleY = (targetHeightCm + .5) / templateBase.alto;
    var scaleFactor = Math.min(scaleX, scaleY);

    logFile.writeln("Escalando grupo " + group.name);
    logFile.writeln("Dimensiones objetivo (cm) -> ancho: " + targetWidthCm + ", alto: " + targetHeightCm);
    logFile.writeln("Factor de escala final: " + (scaleFactor*100).toFixed(2) + "%");

    group.resize(scaleFactor*100, scaleFactor*100);
}

main();
