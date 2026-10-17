import sql from 'mssql';
import { config } from '../config/env.js';

export { sql };

/** Pool de conexiones compartido por todos los repositorios SQL. */
export const pool = new sql.ConnectionPool({
    server: config.sql.server,
    port: config.sql.port,
    database: config.sql.database,
    user: config.sql.user,
    password: config.sql.password,
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: {
        encrypt: config.sql.encrypt,
        trustServerCertificate: config.sql.trustServerCertificate,
        useUTC: true
    }
});

pool.on('error', (error) => console.error('[SQL Server] Error en el pool:', error.message));

export const conectarSql = async () => pool.connect();

export const cerrarSql = async () => pool.close();

export const sqlDisponible = async () => {
    if (!pool.connected) return false;
    try {
        await pool.request().query('SELECT 1 AS ok');
        return true;
    } catch {
        return false;
    }
};
