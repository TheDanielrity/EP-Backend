import { pool, sql } from '../db/sqlserver.js';

/** Acceso a datos de la tabla dbo.Usuarios (patrón Repository). */
const COLUMNAS = 'codigo, nombres, correo, fechaCreacion';

export const usuariosRepository = {
    async listar() {
        const { recordset } = await pool.request()
            .query(`SELECT ${COLUMNAS} FROM dbo.Usuarios ORDER BY nombres`);
        return recordset;
    },

    async obtener(codigo) {
        const { recordset } = await pool.request()
            .input('codigo', sql.UniqueIdentifier, codigo)
            .query(`SELECT ${COLUMNAS} FROM dbo.Usuarios WHERE codigo = @codigo`);
        return recordset[0] ?? null;
    },

    async crear({ nombres, correo }) {
        const { recordset } = await pool.request()
            .input('nombres', sql.NVarChar(100), nombres)
            .input('correo', sql.NVarChar(150), correo)
            .query(`INSERT INTO dbo.Usuarios (nombres, correo)
                    OUTPUT INSERTED.codigo, INSERTED.nombres, INSERTED.correo, INSERTED.fechaCreacion
                    VALUES (@nombres, @correo)`);
        return recordset[0];
    },

    async actualizar(codigo, { nombres, correo }) {
        const { recordset } = await pool.request()
            .input('codigo', sql.UniqueIdentifier, codigo)
            .input('nombres', sql.NVarChar(100), nombres)
            .input('correo', sql.NVarChar(150), correo)
            .query(`UPDATE dbo.Usuarios SET nombres = @nombres, correo = @correo
                    OUTPUT INSERTED.codigo, INSERTED.nombres, INSERTED.correo, INSERTED.fechaCreacion
                    WHERE codigo = @codigo`);
        return recordset[0] ?? null;
    },

    async eliminar(codigo) {
        const { rowsAffected } = await pool.request()
            .input('codigo', sql.UniqueIdentifier, codigo)
            .query('DELETE FROM dbo.Usuarios WHERE codigo = @codigo');
        return rowsAffected[0] > 0;
    }
};
