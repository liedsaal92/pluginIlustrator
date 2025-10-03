// Script Illustrator (.jsx) - Duplicar grupo FRENTE según jugadores y tallas, con logging en archivo

function main() {
    var doc = app.activeDocument;

    // Datos simulados (pueden venir de CSV más adelante)
    var jugadores = [
        {nombre: "Juan", numero: 10, talla: "M"},
        {nombre: "Pedro", numero: 7, talla: "L"},
        {nombre: "Carlos", numero: 9, talla: "S"},
        {nombre: "Andrés", numero: 11, talla: "XL"}
    ];

    // Escalas por talla (%)
    var tallas = {
        "XS": 90,
        "S": 95,
        "M": 100,
        "L": 105,
        "XL": 110
    };

    // Archivo de log en escritorio
    var logFile = new File("~/Desktop/log_camisetas.txt");
    logFile.open("w");
    logFile.writeln("=== Inicio del script ===");
    logFile.writeln("Documento: " + doc.name);

    // Función recursiva para buscar un grupo por nombre dentro de cualquier nivel
    function findGroupByName(parent, name) {
        for (var i = 0; i < parent.pageItems.length; i++) {
            var item = parent.pageItems[i];
            if (item.typename === "GroupItem" && item.name === name) {
                return item;
            }
        }
        return null;
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

        // Buscar grupo FRENTE dentro de TEMPLATE
        var baseGroup = findGroupByName(templateLayer, "FRENTE");
        if (!baseGroup) {
            logFile.writeln("Error: grupo FRENTE no encontrado dentro de TEMPLATE");
            return;
        }
        logFile.writeln("Grupo FRENTE encontrado: " + baseGroup.name);

        // Recorremos jugadores
        for (var i = 0; i < jugadores.length; i++) {
            var j = jugadores[i];
            try {
                // Duplicar grupo
                var copia = baseGroup.duplicate();
                copia.name = "FRENTE_" + j.nombre + "_" + j.numero + "_" + j.talla;

                // Escalar
                var escala = tallas[j.talla];
                if (escala) {
                    copia.resize(escala, escala); // escala uniforme
                }

                logFile.writeln("Grupo duplicado: " + copia.name + ", escala aplicada: " + escala + "%");
            } catch(e) {
                logFile.writeln("Error duplicando o escalando grupo para " + j.nombre + ": " + e.message);
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
