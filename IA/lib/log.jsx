// ============================================================
//  log.jsx
//  Sistema de logging: registra eventos y exporta a archivo .txt
// ============================================================

var Log = {
    lineas:    [],
    resumen:   { ok: 0, info: 0, error: 0, fatal: 0 },
    omisiones: [],
    errores:   [],

    _linea: function(prefijo, msg) {
        var linea = prefijo + " " + msg;
        this.lineas.push(linea);
    },

    ok: function(msg) {
        this._linea("[OK]   ", msg);
        this.resumen.ok++;
    },

    info: function(msg) {
        this._linea("[INFO] ", msg);
        this.resumen.info++;
        this.omisiones.push(msg);
    },

    error: function(msg) {
        this._linea("[ERROR]", msg);
        this.resumen.error++;
        this.errores.push(msg);
    },

    fatal: function(msg) {
        this._linea("[FATAL]", msg);
        this.resumen.fatal++;
        this.errores.push("FATAL: " + msg);
    },

    exportar: function(carpeta) {
        var timestamp = getTimestamp();
        var archivo = new File(carpeta + "/log_equipo_" + timestamp + ".txt");
        archivo.encoding = "UTF-8";
        archivo.open("w");

        archivo.writeln("================================================");
        archivo.writeln("  GENERAR_EQUIPO.jsx v2.0 — Log de ejecución");
        archivo.writeln("  " + new Date().toString());
        archivo.writeln("================================================");
        archivo.writeln("");

        for (var i = 0; i < this.lineas.length; i++) {
            archivo.writeln(this.lineas[i]);
        }

        archivo.writeln("");
        archivo.writeln("================================================");
        archivo.writeln("  RESUMEN FINAL");
        archivo.writeln("================================================");
        archivo.writeln("OK     : " + this.resumen.ok);
        archivo.writeln("INFO   : " + this.resumen.info);
        archivo.writeln("ERROR  : " + this.resumen.error);
        archivo.writeln("FATAL  : " + this.resumen.fatal);

        if (this.omisiones.length > 0) {
            archivo.writeln("");
            archivo.writeln("OMISIONES (" + this.omisiones.length + "):");
            for (var o = 0; o < this.omisiones.length; o++) {
                archivo.writeln("  - " + this.omisiones[o]);
            }
        }

        if (this.errores.length > 0) {
            archivo.writeln("");
            archivo.writeln("ERRORES Y FATALES (" + this.errores.length + "):");
            for (var e = 0; e < this.errores.length; e++) {
                archivo.writeln("  - " + this.errores[e]);
            }
        }

        archivo.writeln("");
        archivo.writeln("Log guardado en: " + archivo.fsName);
        archivo.close();

        return archivo.fsName;
    }
};
