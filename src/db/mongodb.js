import { MongoClient } from 'mongodb';
import { config } from '../config/env.js';

export const COLECCIONES = Object.freeze({
    logs: 'logs',
    comentarios: 'comentarios'
});

/**
 * Validadores $jsonSchema.
 * Solo se exigen los campos comunes; el subdocumento `datos` de los logs queda
 * abierto (esquema flexible) para que cada tipo de evento guarde su propia forma.
 */
const VALIDADORES = Object.freeze({
    [COLECCIONES.logs]: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['tipo', 'nivel', 'fecha'],
            properties: {
                tipo: { bsonType: 'string', description: 'peticion | auditoria | error | sistema | ...' },
                nivel: { enum: ['info', 'warn', 'error'] },
                fecha: { bsonType: 'date' },
                datos: { bsonType: 'object', description: 'Contenido libre según el tipo de evento' }
            }
        }
    },
    [COLECCIONES.comentarios]: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['codigoSala', 'autor', 'texto', 'calificacion', 'fecha'],
            properties: {
                codigoSala: { bsonType: 'string' },
                autor: {
                    bsonType: 'object',
                    required: ['codigoUsuario', 'nombres'],
                    properties: {
                        codigoUsuario: { bsonType: 'string' },
                        nombres: { bsonType: 'string' }
                    }
                },
                texto: { bsonType: 'string', minLength: 1, maxLength: 500 },
                calificacion: { bsonType: 'int', minimum: 1, maximum: 5 },
                etiquetas: { bsonType: 'array', items: { bsonType: 'string' } },
                fecha: { bsonType: 'date' }
            }
        }
    }
});

export const clienteMongo = new MongoClient(config.mongo.uri, {
    serverSelectionTimeoutMS: 5000,
    appName: 'mythos-backend'
});

export const mongoDB = clienteMongo.db(config.mongo.database);

let conectado = false;

export const estaConectadoMongo = () => conectado;

export const coleccion = (nombre) => mongoDB.collection(nombre);

/** Crea las colecciones con su validador o actualiza el validador si ya existen. */
const asegurarColeccion = async (nombre, existentes) => {
    const opciones = { validator: VALIDADORES[nombre], validationLevel: 'moderate', validationAction: 'error' };
    if (existentes.has(nombre)) {
        await mongoDB.command({ collMod: nombre, ...opciones });
    } else {
        await mongoDB.createCollection(nombre, opciones);
    }
};

/** Índice TTL: MongoDB elimina automáticamente los logs con más días que la retención. */
const asegurarIndiceTtl = async () => {
    const segundos = config.mongo.diasRetencionLogs * 24 * 60 * 60;
    const logs = coleccion(COLECCIONES.logs);
    const existente = (await logs.indexes()).find((indice) => indice.name === 'ttl_fecha');
    if (existente && existente.expireAfterSeconds !== segundos) {
        await mongoDB.command({
            collMod: COLECCIONES.logs,
            index: { name: 'ttl_fecha', expireAfterSeconds: segundos }
        });
        return;
    }
    if (!existente) {
        await logs.createIndex({ fecha: 1 }, { name: 'ttl_fecha', expireAfterSeconds: segundos });
    }
};

export const inicializarMongo = async () => {
    const existentes = new Set(
        (await mongoDB.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name)
    );
    for (const nombre of Object.values(COLECCIONES)) {
        await asegurarColeccion(nombre, existentes);
    }

    await asegurarIndiceTtl();
    await coleccion(COLECCIONES.logs).createIndexes([
        { key: { tipo: 1, fecha: -1 }, name: 'tipo_fecha' },
        { key: { nivel: 1, fecha: -1 }, name: 'nivel_fecha' }
    ]);
    await coleccion(COLECCIONES.comentarios).createIndexes([
        { key: { codigoSala: 1, fecha: -1 }, name: 'sala_fecha' },
        { key: { 'autor.codigoUsuario': 1 }, name: 'autor_usuario' }
    ]);
};

export const conectarMongo = async () => {
    await clienteMongo.connect();
    await mongoDB.command({ ping: 1 });
    conectado = true;
    await inicializarMongo();
};

export const cerrarMongo = async () => {
    conectado = false;
    await clienteMongo.close();
};

export const mongoDisponible = async () => {
    if (!conectado) return false;
    try {
        await mongoDB.command({ ping: 1 });
        return true;
    } catch {
        return false;
    }
};
