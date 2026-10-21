import { MongoClient } from 'mongodb';
import { config } from '../config/env.js';

export const COLECCIONES = Object.freeze({
    logs: 'logs',
    comentarios: 'comentarios'
});

export const clienteMongo = new MongoClient(config.mongo.uri, {
    serverSelectionTimeoutMS: 5000,
    appName: 'mythos-backend'
});

export const mongoDB = clienteMongo.db(config.mongo.database);

let conectado = false;

export const estaConectadoMongo = () => conectado;

export const coleccion = (nombre) => mongoDB.collection(nombre);

export const conectarMongo = async () => {
    await clienteMongo.connect();
    await mongoDB.command({ ping: 1 });
    // La estructura se prepara desde el repositorio EP-Backend_MongoDB.
    const existentes = (await mongoDB.listCollections({}, { nameOnly: true }).toArray())
        .map((coleccion) => coleccion.name);
    const faltantes = Object.values(COLECCIONES).filter((nombre) => !existentes.includes(nombre));
    if (faltantes.length > 0) {
        throw new Error(`Faltan colecciones de MongoDB: ${faltantes.join(', ')}. Ejecuta inicializar.js en el repositorio EP-Backend_MongoDB.`);
    }
    conectado = true;
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
