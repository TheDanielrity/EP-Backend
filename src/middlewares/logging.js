import { randomUUID } from 'node:crypto';
import { logsRepository } from '../repositories/logsRepository.js';

const nivelPorEstado = (estado) => (estado >= 500 ? 'error' : estado >= 400 ? 'warn' : 'info');

/**
 * Middleware de logging de peticiones.
 * - Asigna un identificador único (cabecera X-Request-Id) para rastrear la petición.
 * - Al terminar la respuesta, escribe una línea en consola y guarda el evento en MongoDB.
 */
export const logging = (req, res, next) => {
    const inicio = process.hrtime.bigint();
    req.id = req.get('X-Request-Id') || randomUUID();
    res.set('X-Request-Id', req.id);

    res.on('finish', () => {
        const duracionMs = Number((process.hrtime.bigint() - inicio) / 1000n) / 1000;
        const estado = res.statusCode;
        console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${estado} ${duracionMs}ms`);

        void logsRepository.registrar('peticion', {
            idPeticion: req.id,
            metodo: req.method,
            ruta: req.originalUrl,
            estado,
            duracionMs,
            ip: req.ip,
            agente: req.get('User-Agent')
        }, nivelPorEstado(estado));
    });

    next();
};
