import { pool, sql } from '../db/sqlserver.js';

/**
 * Acceso a datos de la tabla dbo.Salas (patrón Repository).
 * Todas las consultas son parametrizadas para evitar inyección SQL.
 */
const COLUMNAS = 'codigo, nombre, capacidad, fechaCreacion';

export const salasRepository = {
    async listar({ capacidadMinima } = {}) {
        const request = pool.request();
        let consulta = `SELECT ${COLUMNAS} FROM dbo.Salas`;
        if (capacidadMinima !== undefined) {
            request.input('capacidadMinima', sql.Int, capacidadMinima);
            consulta += ' WHERE capacidad >= @capacidadMinima';
        }
        const { recordset } = await request.query(`${consulta} ORDER BY nombre`);
        return recordset;
    },

    async obtener(codigo) {
        const { recordset } = await pool.request()
            .input('codigo', sql.UniqueIdentifier, codigo)
            .query(`SELECT ${COLUMNAS} FROM dbo.Salas WHERE codigo = @codigo`);
        return recordset[0] ?? null;
    },

    async crear({ nombre, capacidad }) {
        const { recordset } = await pool.request()
            .input('nombre', sql.NVarChar(100), nombre)
            .input('capacidad', sql.Int, capacidad)
            .query(`INSERT INTO dbo.Salas (nombre, capacidad)
                    OUTPUT INSERTED.codigo, INSERTED.nombre, INSERTED.capacidad, INSERTED.fechaCreacion
                    VALUES (@nombre, @capacidad)`);
        return recordset[0];
    },

    async actualizar(codigo, { nombre, capacidad }) {
        const { recordset } = await pool.request()
            .input('codigo', sql.UniqueIdentifier, codigo)
            .input('nombre', sql.NVarChar(100), nombre)
            .input('capacidad', sql.Int, capacidad)
            .query(`UPDATE dbo.Salas SET nombre = @nombre, capacidad = @capacidad
                    OUTPUT INSERTED.codigo, INSERTED.nombre, INSERTED.capacidad, INSERTED.fechaCreacion
                    WHERE codigo = @codigo`);
        return recordset[0] ?? null;
    },

    async eliminar(codigo) {
        const { rowsAffected } = await pool.request()
            .input('codigo', sql.UniqueIdentifier, codigo)
            .query('DELETE FROM dbo.Salas WHERE codigo = @codigo');
        return rowsAffected[0] > 0;
    }
};
