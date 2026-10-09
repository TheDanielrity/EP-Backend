import { registrarEvento } from '../db/mongodb.js';

export const manejoErrores = (error, req, res, next) => {
    if (res.headersSent) return next(error);

    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ mensaje: 'El cuerpo debe contener un JSON válido' });
    }

    const numeroSQL = error.number || error.originalError?.info?.number;
    const estadosSQL = { 50001: 400, 50002: 404, 50003: 404, 50004: 409, 2601: 409, 2627: 409 };
    const estado = estadosSQL[numeroSQL] || error.status || 500;
    void registrarEvento('error', {
        ruta: req.originalUrl, estado,
        mensaje: estado >= 500 ? 'Error interno del servidor' : error.message
    });
    if (estado >= 500) console.error(error);

    res.status(estado).json({
        mensaje: estado >= 500 ? 'Error interno del servidor' :
            [2601, 2627].includes(numeroSQL) ? 'El correo ya esta registrado' : error.message
    });
};
