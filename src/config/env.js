/**
 * Configuración centralizada de la aplicación.
 * Todas las variables de entorno se leen en un único lugar para que el resto
 * del código no dependa directamente de process.env.
 */

const entero = (valor, porDefecto) => {
    const numero = Number.parseInt(valor ?? '', 10);
    return Number.isInteger(numero) ? numero : porDefecto;
};

const booleano = (valor, porDefecto) => {
    if (valor === undefined || valor === '') return porDefecto;
    return valor.toLowerCase() === 'true';
};

export const config = Object.freeze({
    entorno: process.env.NODE_ENV ?? 'development',
    puerto: entero(process.env.PORT, 3000),
    prefijoApi: '/api/v1',
    corsOrigen: process.env.CORS_ORIGIN ?? '*',
    sql: Object.freeze({
        server: process.env.SQL_SERVER ?? 'localhost',
        port: entero(process.env.SQL_PORT, 1433),
        database: process.env.SQL_DATABASE ?? 'MythosReservasDB',
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        encrypt: booleano(process.env.SQL_ENCRYPT, false),
        trustServerCertificate: booleano(process.env.SQL_TRUST_CERTIFICATE, true)
    }),
    mongo: Object.freeze({
        uri: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017',
        database: process.env.MONGO_DATABASE ?? 'MythosLogs'
    })
});

/** Verifica que existan las variables obligatorias antes de iniciar el servidor. */
export const validarConfig = () => {
    const obligatorias = ['SQL_USER', 'SQL_PASSWORD'];
    const faltantes = obligatorias.filter((nombre) => !process.env[nombre]);
    if (faltantes.length > 0) {
        throw new Error(`Faltan variables de entorno: ${faltantes.join(', ')}. Revisa el archivo .env`);
    }
};
