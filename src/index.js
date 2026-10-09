import { app } from './app.js';
import { pool } from './db/sqlserver.js';
import { clienteMongo, registrarEvento } from './db/mongodb.js';

const PUERTO = 3000;

try {
    await pool.connect();
    await clienteMongo.connect();
    await registrarEvento('inicio', { mensaje: 'Servidor iniciado', puerto: PUERTO });
    app.listen(PUERTO, () => {
        console.log(`Servidor disponible en http://localhost:${PUERTO}`);
    });
} catch (error) {
    console.error('No se pudo iniciar el servidor:', error.message);
    await Promise.allSettled([pool.close(), clienteMongo.close()]);
    process.exitCode = 1;
}
