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
                if (hdr === "NUMERO"             || hdr === "ALTO"               || hdr === "ANCHO"              ||
                    hdr === "MANGA_ALTO"          || hdr === "MANGA_ANCHO"        ||
                    // NOMBRE
                    hdr === "NOMBRE_F_ANCHO"      || hdr === "NOMBRE_F_ALTO"      ||
                    hdr === "NOMBRE_F_MARGIN_SUP" ||
                    hdr === "NOMBRE_E_ANCHO"      || hdr === "NOMBRE_E_ALTO"      ||
                    // NUMERO por pieza
                    hdr === "NUMERO_FRENTE_ANCHO" || hdr === "NUMERO_FRENTE_ALTO" ||
                    hdr === "NUMERO_FRENTE_MARGIN_SUP" ||
                    hdr === "NUMERO_ESPALDA_ANCHO"|| hdr === "NUMERO_ESPALDA_ALTO"||
                    hdr === "NUMERO_M_IZQ_ANCHO"  || hdr === "NUMERO_M_IZQ_ALTO"  ||
                    hdr === "NUMERO_M_DER_ANCHO"  || hdr === "NUMERO_M_DER_ALTO"  ||
                    // ESCUDO
                    hdr === "ESCUDO_F_ANCHO"      || hdr === "ESCUDO_F_ALTO"      ||
                    hdr === "ESCUDO_E_ANCHO"      || hdr === "ESCUDO_E_ALTO"      ||
                    hdr === "ESCUDO_CENTRAL_ANCHO"|| hdr === "ESCUDO_CENTRAL_ALTO"||
                    hdr === "ESCUDO_M_IZQ_ANCHO"  || hdr === "ESCUDO_M_IZQ_ALTO"  ||
                    hdr === "ESCUDO_M_DER_ANCHO"  || hdr === "ESCUDO_M_DER_ALTO"  ||
                    hdr === "ESCUDO_M_IZQ_MARGIN_INF" || hdr === "ESCUDO_M_DER_MARGIN_INF" ||
                    hdr === "ESCUDO_F_MARGIN_LAT" ||
                    // LOGO MARCA
                    hdr === "LOGO_MARCA_ANCHO"    || hdr === "LOGO_MARCA_ALTO"    ||
                    hdr === "LOGO_MARCA_MARGIN_LAT" ||
                    // SPONSORS TOP
                    hdr === "SPONSOR_TOP_IZQ_ANCHO" || hdr === "SPONSOR_TOP_IZQ_ALTO" ||
                    hdr === "SPONSOR_TOP_IZQ_MARGIN_SUP" ||
                    hdr === "SPONSOR_TOP_DER_ANCHO" || hdr === "SPONSOR_TOP_DER_ALTO" ||
                    hdr === "SPONSOR_TOP_DER_MARGIN_SUP" ||
                    hdr === "SPONSOR_TOP_IZQ_SEC_ANCHO" || hdr === "SPONSOR_TOP_IZQ_SEC_ALTO" ||
                    hdr === "SPONSOR_TOP_IZQ_SEC_MARGIN_SUP" ||
                    hdr === "SPONSOR_TOP_DER_SEC_ANCHO" || hdr === "SPONSOR_TOP_DER_SEC_ALTO" ||
                    hdr === "SPONSOR_TOP_DER_SEC_MARGIN_SUP" ||
                    // SPONSORS PRINCIPAL
                    hdr === "SPONSOR_PRINCIPAL_F_ANCHO"  || hdr === "SPONSOR_PRINCIPAL_F_ALTO"  ||
                    hdr === "SPONSOR_PRINCIPAL_E_ANCHO"  || hdr === "SPONSOR_PRINCIPAL_E_ALTO"  ||
                    hdr === "SPONSOR_PRINCIPAL_E_MARGIN_SUP" ||
                    // SPONSORS SECUNDARIO
                    hdr === "SPONSOR_SECUNDARIO_F_ANCHO" || hdr === "SPONSOR_SECUNDARIO_F_ALTO" ||
                    hdr === "SPONSOR_SECUNDARIO_F_MARGIN_SUP" ||
                    hdr === "SPONSOR_SECUNDARIO_E_ANCHO" || hdr === "SPONSOR_SECUNDARIO_E_ALTO" ||
                    hdr === "SPONSOR_SECUNDARIO_E_MARGIN_SUP" ||
                    hdr === "SPONSOR_SECUNDARIO_M_IZQ_ANCHO" || hdr === "SPONSOR_SECUNDARIO_M_IZQ_ALTO" ||
                    hdr === "SPONSOR_SECUNDARIO_M_IZQ_MARGIN_INF" ||
                    hdr === "SPONSOR_SECUNDARIO_M_DER_ANCHO" || hdr === "SPONSOR_SECUNDARIO_M_DER_ALTO" ||
                    hdr === "SPONSOR_SECUNDARIO_M_DER_MARGIN_INF" ||
                    // COSTILLA
                    hdr === "COSTILLA_F_ANCHO"    || hdr === "COSTILLA_F_ALTO"    ||
                    hdr === "COSTILLA_E_ANCHO"    || hdr === "COSTILLA_E_ALTO"    ||
                    // ETIQUETA PRINCIPAL / SECUNDARIA
                    hdr === "ETIQUETA_PRINCIPAL_F_ANCHO"      || hdr === "ETIQUETA_PRINCIPAL_F_ALTO"      ||
                    hdr === "ETIQUETA_PRINCIPAL_F_MARGIN_INF" || hdr === "ETIQUETA_PRINCIPAL_F_MARGIN_LAT"||
                    hdr === "ETIQUETA_SECUNDARIA_F_ANCHO"     || hdr === "ETIQUETA_SECUNDARIA_F_ALTO"     ||
                    hdr === "ETIQUETA_SECUNDARIA_F_MARGIN_INF"|| hdr === "ETIQUETA_SECUNDARIA_F_MARGIN_LAT"||
                    hdr === "ETIQUETA_PRINCIPAL_E_ANCHO"      || hdr === "ETIQUETA_PRINCIPAL_E_ALTO"      ||
                    hdr === "ETIQUETA_PRINCIPAL_E_MARGIN_INF" || hdr === "ETIQUETA_PRINCIPAL_E_MARGIN_LAT"||
                    hdr === "ETIQUETA_SECUNDARIA_E_ANCHO"     || hdr === "ETIQUETA_SECUNDARIA_E_ALTO"     ||
                    hdr === "ETIQUETA_SECUNDARIA_E_MARGIN_INF"|| hdr === "ETIQUETA_SECUNDARIA_E_MARGIN_LAT"||
                    hdr === "ETIQUETA_TOP_ANCHO"  || hdr === "ETIQUETA_TOP_ALTO"  ||
                    // LÍNEAS DE MANGA IZQ
                    hdr === "MANGA_IZQ_LINEA_IZQ_ANCHO" || hdr === "MANGA_IZQ_LINEA_IZQ_ALTO" ||
                    hdr === "MANGA_IZQ_LINEA_DER_ANCHO" || hdr === "MANGA_IZQ_LINEA_DER_ALTO" ||
                    hdr === "MANGA_IZQ_LINEA_INF_ANCHO" || hdr === "MANGA_IZQ_LINEA_INF_ALTO" ||
                    // LÍNEAS DE MANGA DER
                    hdr === "MANGA_DER_LINEA_IZQ_ANCHO" || hdr === "MANGA_DER_LINEA_IZQ_ALTO" ||
                    hdr === "MANGA_DER_LINEA_DER_ANCHO" || hdr === "MANGA_DER_LINEA_DER_ALTO" ||
                    hdr === "MANGA_DER_LINEA_INF_ANCHO" || hdr === "MANGA_DER_LINEA_INF_ALTO") {
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
                // FRENTE
                "LLEVA_NOMBRE_F", "LLEVA_NUMERO_F",
                "LLEVA_ESCUDO_CENTRAL", "LLEVA_LOGO_MARCA",
                "LLEVA_SPONSOR_TOP_IZQ", "LLEVA_SPONSOR_TOP_DER",
                "LLEVA_SPONSOR_TOP_IZQ_SEC", "LLEVA_SPONSOR_TOP_DER_SEC",
                "LLEVA_SPONSOR_PRINCIPAL_F", "LLEVA_SPONSOR_SECUNDARIO_F",
                "LLEVA_COSTILLA_F",
                "LLEVA_ETIQUETA_PRINCIPAL_F", "LLEVA_ETIQUETA_SECUNDARIA_F",
                // ESPALDA
                "LLEVA_NOMBRE_E", "LLEVA_NUMERO_E",
                "LLEVA_ESCUDO_E", "LLEVA_ETIQUETA_TOP",
                "LLEVA_ETIQUETA_PRINCIPAL_E", "LLEVA_ETIQUETA_SECUNDARIA_E",
                "LLEVA_SPONSOR_PRINCIPAL_E", "LLEVA_SPONSOR_SECUNDARIO_E",
                "LLEVA_COSTILLA_E",
                // MANGA IZQ
                "LLEVA_NUMERO_M_IZQ",
                "LLEVA_ESCUDO_M_IZQ", "LLEVA_SPONSOR_SECUNDARIO_M_IZQ",
                "LLEVA_MANGA_IZQ_LINEA_IZQ", "LLEVA_MANGA_IZQ_LINEA_DER", "LLEVA_MANGA_IZQ_LINEA_INF",
                // MANGA DER
                "LLEVA_NUMERO_M_DER",
                "LLEVA_ESCUDO_M_DER", "LLEVA_SPONSOR_SECUNDARIO_M_DER",
                "LLEVA_MANGA_DER_LINEA_IZQ", "LLEVA_MANGA_DER_LINEA_DER", "LLEVA_MANGA_DER_LINEA_INF"
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
