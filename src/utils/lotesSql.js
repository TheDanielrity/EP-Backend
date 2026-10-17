/**
 * Divide un script de SQL Server en lotes usando el separador GO.
 * GO no es una instrucción T-SQL: lo interpretan SSMS y sqlcmd. Para ejecutar el
 * script desde Node.js hay que separar los lotes y enviarlos uno por uno
 * (por ejemplo, CREATE PROCEDURE debe ser la primera instrucción de su lote).
 */
const SEPARADOR_GO = /^\s*GO\s*(?:--.*)?$/i;

export const dividirEnLotes = (script) => {
    const lotes = [];
    let actual = [];
    for (const linea of script.replace(/\r\n/g, '\n').split('\n')) {
        if (SEPARADOR_GO.test(linea)) {
            lotes.push(actual.join('\n'));
            actual = [];
        } else {
            actual.push(linea);
        }
    }
    lotes.push(actual.join('\n'));
    return lotes.map((lote) => lote.trim()).filter((lote) => lote.length > 0 && !soloComentarios(lote));
};

const soloComentarios = (lote) => lote
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .every((linea) => linea.trim() === '' || linea.trim().startsWith('--'));
