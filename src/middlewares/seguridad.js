import { config } from '../config/env.js';

/**
 * Cabeceras de seguridad básicas y CORS.
 * Se implementa sin dependencias externas para mantener el proyecto liviano.
 */
export const seguridad = (req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer',
        'Access-Control-Allow-Origin': config.corsOrigen,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Request-Id',
        'Access-Control-Expose-Headers': 'Location, X-Request-Id'
    });

    // Respuesta a la petición "preflight" de los navegadores.
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
};
