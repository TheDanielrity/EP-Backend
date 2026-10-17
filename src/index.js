import { app } from './app.js';
import { config, validarConfig } from './config/env.js';
import { cerrarMongo, conectarMongo } from './db/mongodb.js';
import { cerrarSql, conectarSql } from './db/sqlserver.js';
import { logsRepository } from './repositories/logsRepository.js';

let servidor;

const cerrarConexiones = () => Promise.allSettled([cerrarSql(), cerrarMongo()]);

/** Cierre ordenado: deja de aceptar peticiones y luego cierra las bases de datos. */
const apagar = async (senal) => {
    console.log(`\nSe recibió ${senal}. Cerrando el servidor...`);
    await logsRepository.registrar('sistema', { mensaje: 'Servidor detenido', senal });
    servidor?.close(async () => {
        await cerrarConexiones();
        console.log('Conexiones cerradas.');
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
};

try {
    validarConfig();
    await conectarSql();
    console.log(`[SQL Server] Conectado a ${config.sql.server}:${config.sql.port}/${config.sql.database}`);
    await conectarMongo();
    console.log(`[MongoDB] Conectado a la base ${config.mongo.database}`);

    servidor = app.listen(config.puerto, () => {
        console.log(`API disponible en http://localhost:${config.puerto}${config.prefijoApi}`);
    });

    await logsRepository.registrar('sistema', {
        mensaje: 'Servidor iniciado', puerto: config.puerto, entorno: config.entorno
    });

    process.on('SIGINT', apagar);
    process.on('SIGTERM', apagar);
} catch (error) {
    console.error('No se pudo iniciar el servidor:', error.message);
    await cerrarConexiones();
    process.exitCode = 1;
}
