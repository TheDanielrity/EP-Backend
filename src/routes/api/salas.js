import express from 'express';
import { pool, sql } from '../../db/sqlserver.js';
import { validarSala } from '../../middlewares/validacion.js';

export const salas = express.Router();

salas.get('/', async (req, res) => {
    const resultado = await pool.request().query('SELECT codigo, nombre, capacidad FROM dbo.Salas');
    res.json(resultado.recordset);
});

salas.post('/', validarSala, async (req, res) => {
    const resultado = await pool.request()
        .input('nombre', sql.NVarChar(100), req.body.nombre.trim())
        .input('capacidad', sql.Int, req.body.capacidad)
        .query(`INSERT INTO dbo.Salas (nombre, capacidad)
                OUTPUT INSERTED.codigo, INSERTED.nombre, INSERTED.capacidad
                VALUES (@nombre, @capacidad)`);
    res.status(201).json(resultado.recordset[0]);
});
