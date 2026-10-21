import { COLECCIONES, coleccion, estaConectadoMongo } from '../db/mongodb.js';

/**
 * Registro de actividad del sistema en MongoDB (colección `logs`).
 *
 * Todos los documentos comparten { tipo, nivel, fecha } y guardan en `datos`
 * un subdocumento BSON con la forma que necesite cada tipo de evento:
 *   peticion  -> { metodo, ruta, estado, duracionMs, ip, idPeticion }
 *   auditoria -> { accion, entidad, codigo, cambios }
 *   error     -> { ruta, estado, mensaje }
 *   sistema   -> { mensaje, puerto, entorno }
 */
const logs = () => coleccion(COLECCIONES.logs);

export const logsRepository = {
    /**
     * Guarda un evento sin interrumpir la petición: un fallo de MongoDB no debe
     * revertir una operación SQL que ya se confirmó.
     */
    async registrar(tipo, datos = {}, nivel = 'info') {
        if (!estaConectadoMongo()) return;
        try {
            await logs().insertOne({ tipo, nivel, fecha: new Date(), datos });
        } catch (error) {
            console.error('[MongoDB] No se pudo guardar el log:', error.message);
        }
    },

    async listar({ tipo, nivel, desde, hasta, pagina = 1, limite = 20 } = {}) {
        const filtro = {};
        if (tipo) filtro.tipo = tipo;
        if (nivel) filtro.nivel = nivel;
        if (desde || hasta) {
            filtro.fecha = {};
            if (desde) filtro.fecha.$gte = new Date(desde);
            if (hasta) filtro.fecha.$lte = new Date(hasta);
        }

        const [datos, total] = await Promise.all([
            logs().find(filtro).sort({ fecha: -1 }).skip((pagina - 1) * limite).limit(limite).toArray(),
            logs().countDocuments(filtro)
        ]);
        return { pagina, limite, total, datos };
    },

    /** Pipeline de agregación: cantidad de eventos por tipo y nivel. */
    async resumen() {
        return logs().aggregate([
            { $group: { _id: { tipo: '$tipo', nivel: '$nivel' }, cantidad: { $sum: 1 }, ultimo: { $max: '$fecha' } } },
            { $project: { _id: 0, tipo: '$_id.tipo', nivel: '$_id.nivel', cantidad: 1, ultimo: 1 } },
            { $sort: { cantidad: -1 } }
        ]).toArray();
    }
};
