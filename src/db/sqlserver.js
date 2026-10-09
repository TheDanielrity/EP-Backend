import sql from 'mssql';

export { sql };
export const pool = new sql.ConnectionPool({
    server: process.env.SQL_SERVER || 'localhost',
    port: Number(process.env.SQL_PORT || 1433),
    database: process.env.SQL_DATABASE || 'ReservasDB',
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    options: {
        encrypt: process.env.SQL_ENCRYPT !== 'false',
        trustServerCertificate: process.env.SQL_TRUST_CERTIFICATE === 'true',
        useUTC: true
    }
});
pool.on('error', (error) => console.error('Error de SQL Server:', error.message));
