import { pool, sql } from '../db/sqlserver.js';

/**
 * Acceso a datos de reservas.
 * - Lecturas: vista dbo.vw_ReservasDetalle (JOIN con Salas y Usuarios).
 * - Escrituras: procedimientos almacenados transaccionales
 *   dbo.RegistrarReserva y dbo.ActualizarReserva.
 */
const COLUMNAS = `codigo, codigoSala, nombreSala, codigoUsuario, nombresUsuario,
                  fechaInicio, fechaFin, fechaCreacion`;

export const reservasRepository = {
    async listar({ codigoSala, codigoUsuario, desde, hasta } = {}) {
        const request = pool.request();
        const condiciones = [];
        if (codigoSala) {
            request.input('codigoSala', sql.UniqueIdentifier, codigoSala);
            condiciones.push('codigoSala = @codigoSala');
        }
        if (codigoUsuario) {
            request.input('codigoUsuario', sql.UniqueIdentifier, codigoUsuario);
            condiciones.push('codigoUsuario = @codigoUsuario');
        }
        if (desde) {
            request.input('desde', sql.DateTime2, new Date(desde));
            condiciones.push('fechaFin > @desde');
        }
        if (hasta) {
            request.input('hasta', sql.DateTime2, new Date(hasta));
            condiciones.push('fechaInicio < @hasta');
        }
        const filtro = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
        const { recordset } = await request.query(
            `SELECT ${COLUMNAS} FROM dbo.vw_ReservasDetalle ${filtro} ORDER BY fechaInicio`
        );
        return recordset;
    },

    async obtener(codigo) {
        const { recordset } = await pool.request()
            .input('codigo', sql.UniqueIdentifier, codigo)
            .query(`SELECT ${COLUMNAS} FROM dbo.vw_ReservasDetalle WHERE codigo = @codigo`);
        return recordset[0] ?? null;
    },

    /** Ejecuta el procedimiento almacenado que valida disponibilidad y registra la reserva. */
    async crear({ codigoSala, codigoUsuario, fechaInicio, fechaFin }) {
        const { recordset } = await pool.request()
            .input('codigoSala', sql.UniqueIdentifier, codigoSala)
            .input('codigoUsuario', sql.UniqueIdentifier, codigoUsuario)
            .input('fechaInicio', sql.DateTime2, new Date(fechaInicio))
            .input('fechaFin', sql.DateTime2, new Date(fechaFin))
            .execute('dbo.RegistrarReserva');
        return recordset[0];
    },

    async actualizar(codigo, { codigoSala, codigoUsuario, fechaInicio, fechaFin }) {
        const { recordset } = await pool.request()
            .input('codigo', sql.UniqueIdentifier, codigo)
            .input('codigoSala', sql.UniqueIdentifier, codigoSala)
            .input('codigoUsuario', sql.UniqueIdentifier, codigoUsuario)
            .input('fechaInicio', sql.DateTime2, new Date(fechaInicio))
            .input('fechaFin', sql.DateTime2, new Date(fechaFin))
            .execute('dbo.ActualizarReserva');
        return recordset[0];
    },

    async eliminar(codigo) {
        const { rowsAffected } = await pool.request()
            .input('codigo', sql.UniqueIdentifier, codigo)
            .query('DELETE FROM dbo.Reservas WHERE codigo = @codigo');
        return rowsAffected[0] > 0;
    }
};
