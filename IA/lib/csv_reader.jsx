// ============================================================
//  csv_reader.jsx
//  Lectura y parseo del archivo CSV de jugadores
//
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
                if (hdr === "NUMERO"             || hdr === "ESCUDO_ALTO"         ||
                    hdr === "ESCUDO_CENTRAL_ALTO" ||
                    hdr === "ALTO"               || hdr === "ANCHO"              ||
                    hdr === "MANGA_ALTO"          || hdr === "MANGA_ANCHO"        ||
                    hdr === "COSTILLA_ANCHO"      ||
                    hdr === "MANGA_LINEA_IZQ_ANCHO" || hdr === "MANGA_LINEA_DER_ANCHO" ||
                    hdr === "MANGA_LINEA_INF_ALTO" ||
                    hdr === "ETIQUETA_MARGIN_INF" || hdr === "ETIQUETA_MARGIN_LAT" ||
                    hdr === "LOGO_MARCA_ANCHO"   || hdr === "LOGO_MARCA_ALTO"  ||
                    hdr === "NUMERO_FRENTE_ANCHO" || hdr === "NUMERO_FRENTE_ALTO" ||
                    hdr === "SPONSOR_TOP_IZQ_ANCHO" || hdr === "SPONSOR_TOP_DER_ANCHO") {
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
                "LLEVA_NUMERO_F", "LLEVA_NUMERO_E", "LLEVA_NUMERO_M",
                "LLEVA_COSTILLA_F", "LLEVA_COSTILLA_E"
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
