import express from 'express';
import { pool, sql } from '../../db/sqlserver.js';
import { validarUsuario } from '../../middlewares/validacion.js';

export const usuarios = express.Router();

usuarios.get('/', async (req, res) => {
    const resultado = await pool.request().query('SELECT codigo, nombres, correo FROM dbo.Usuarios');
    res.json(resultado.recordset);
});

usuarios.post('/', validarUsuario, async (req, res) => {
    const resultado = await pool.request()
        .input('nombres', sql.NVarChar(100), req.body.nombres.trim())
        .input('correo', sql.NVarChar(150), req.body.correo.trim())
        .query(`INSERT INTO dbo.Usuarios (nombres, correo)
                OUTPUT INSERTED.codigo, INSERTED.nombres, INSERTED.correo
                VALUES (@nombres, @correo)`);
    res.status(201).json(resultado.recordset[0]);
});
