import { config } from '../config/env.js';
import { mongoDisponible, estaConectadoMongo } from '../db/mongodb.js';
import { sqlDisponible } from '../db/sqlserver.js';
import { logsRepository } from '../repositories/logsRepository.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';

const p = config.prefijoApi;

export const sistemaController = {
    /** Punto de entrada de la API: describe los recursos disponibles. */
    indice(req, res) {
        res.json({
            nombre: 'Mythos Coworking - API de Reservas',
            version: '1.0.0',
            recursos: {
                salas: `${p}/salas`,
                usuarios: `${p}/usuarios`,
                reservas: `${p}/reservas`,
                logs: `${p}/logs`,
                salud: `${p}/salud`,
                documentacion: `${p}/docs`,
                openapi: `${p}/openapi.yaml`
            }
        });
    },

    /** Health check: 200 si ambas bases responden, 503 si alguna falla. */
    async salud(req, res) {
        const [sqlServer, mongodb] = await Promise.all([sqlDisponible(), mongoDisponible()]);
        const saludable = sqlServer && mongodb;
        res.status(saludable ? 200 : 503).json({
            estado: saludable ? 'ok' : 'degradado',
            servicios: { sqlServer: sqlServer ? 'ok' : 'caido', mongodb: mongodb ? 'ok' : 'caido' },
            tiempoActivoSegundos: Math.round(process.uptime()),
            fecha: new Date().toISOString()
        });
    },

    async listarLogs(req, res) {
        if (!estaConectadoMongo()) throw new ErrorHttp(503, 'MongoDB no está disponible');
        res.json(await logsRepository.listar(req.validado.query));
    },

    async resumenLogs(req, res) {
        if (!estaConectadoMongo()) throw new ErrorHttp(503, 'MongoDB no está disponible');
        res.json(await logsRepository.resumen());
    }
};
