// ============================================================
//  utils.jsx
//  Utilidades generales: strings, conversiones, timestamps
// ============================================================

function trim(str) {
    if (!str) return "";
    return (str + "").replace(/^\s+|\s+$/g, "");
}

function sanitizar(str) {
    return (str + "").replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_\-]/g, "_");
}

function ptToCm(pt) {
    return pt / CM_TO_PT;
}

function cmToPt(cm) {
    return cm * CM_TO_PT;
}

function getTimestamp() {
    var f = new Date();
    return f.getFullYear() +
           ("0" + (f.getMonth() + 1)).slice(-2) +
           ("0" + f.getDate()).slice(-2) + "_" +
           ("0" + f.getHours()).slice(-2) +
           ("0" + f.getMinutes()).slice(-2) +
           ("0" + f.getSeconds()).slice(-2);
}

function decodificarXml(str) {
    if (!str) return "";
    return str
        .replace(/&amp;/g,  "&")
        .replace(/&lt;/g,   "<")
        .replace(/&gt;/g,   ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

function limpiarCarpeta(folder) {
    var files = folder.getFiles();
    for (var i = 0; i < files.length; i++) {
        if (files[i] instanceof Folder) {
            limpiarCarpeta(files[i]);
            files[i].remove();
        } else {
            files[i].remove();
        }
    }
}
