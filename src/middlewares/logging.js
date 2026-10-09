import { registrarEvento } from '../db/mongodb.js';

export const logging = (req, res, next) => {
    res.on('finish', () => {
        console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode}`);
        void registrarEvento('peticion', {
            metodo: req.method, ruta: req.originalUrl, estado: res.statusCode
        });
    });
    next();
};
