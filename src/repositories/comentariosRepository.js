import { ObjectId } from 'mongodb';
import { COLECCIONES, coleccion } from '../db/mongodb.js';

/**
 * Comentarios y calificaciones de las salas (colección `comentarios`).
 * El nombre del autor se guarda embebido (desnormalizado a propósito) para
 * leer los comentarios sin consultar SQL Server en cada petición.
 */
const comentarios = () => coleccion(COLECCIONES.comentarios);

export const comentariosRepository = {
    async listarPorSala(codigoSala) {
        return comentarios().find({ codigoSala }).sort({ fecha: -1 }).toArray();
    },

    async crear({ codigoSala, autor, texto, calificacion, etiquetas }) {
        const documento = { codigoSala, autor, texto, calificacion, fecha: new Date() };
        if (etiquetas?.length) documento.etiquetas = etiquetas;
        const { insertedId } = await comentarios().insertOne(documento);
        return { _id: insertedId, ...documento };
    },

    async eliminar(codigoSala, id) {
        const { deletedCount } = await comentarios().deleteOne({ _id: new ObjectId(id), codigoSala });
        return deletedCount > 0;
    },

    /** Promedio de calificación y total de comentarios de una sala. */
    async resumenSala(codigoSala) {
        const [resumen] = await comentarios().aggregate([
            { $match: { codigoSala } },
            { $group: { _id: '$codigoSala', promedio: { $avg: '$calificacion' }, total: { $sum: 1 } } },
            { $project: { _id: 0, promedio: { $round: ['$promedio', 2] }, total: 1 } }
        ]).toArray();
        return resumen ?? { promedio: null, total: 0 };
    }
};
