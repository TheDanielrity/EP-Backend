import express from 'express';
import { pool, sql } from '../../db/sqlserver.js';
import { validarReserva } from '../../middlewares/validacion.js';

export const reservas = express.Router();

reservas.get('/', async (req, res) => {
    const resultado = await pool.request().query(
        'SELECT codigo, codigoSala, codigoUsuario, fechaInicio, fechaFin FROM dbo.Reservas'
    );
    res.json(resultado.recordset);
});

reservas.post('/', validarReserva, async (req, res) => {
    const { codigoSala, codigoUsuario, fechaInicio, fechaFin } = req.body;
    const resultado = await pool.request()
        .input('codigoSala', sql.UniqueIdentifier, codigoSala)
        .input('codigoUsuario', sql.UniqueIdentifier, codigoUsuario)
        .input('fechaInicio', sql.DateTime2, new Date(fechaInicio))
        .input('fechaFin', sql.DateTime2, new Date(fechaFin))
        .execute('dbo.RegistrarReserva');
    res.status(201).json(resultado.recordset[0]);
});
