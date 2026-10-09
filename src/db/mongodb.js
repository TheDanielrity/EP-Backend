import { MongoClient } from 'mongodb';

export const clienteMongo = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017', {
    serverSelectionTimeoutMS: 5000
});
export const mongoDB = clienteMongo.db(process.env.MONGO_DATABASE || 'ReservasLogs');

// El driver convierte el documento a BSON. Cada tipo puede tener datos diferentes.
export const registrarEvento = async (tipo, datos) => {
    try {
        await mongoDB.collection('logs').insertOne({ tipo, fecha: new Date(), datos });
    } catch (error) {
        // Un fallo del log no cambia el resultado de una operacion SQL ya realizada.
        console.error('No se pudo guardar el log en MongoDB:', error.message);
    }
};
