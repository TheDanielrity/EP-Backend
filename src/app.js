import express from 'express';
import { config } from './config/env.js';
import { logging } from './middlewares/logging.js';
import { manejoErrores, rutaNoEncontrada } from './middlewares/manejoErrores.js';
import { seguridad } from './middlewares/seguridad.js';
import { apiRouter } from './routes/index.js';

/**
 * Mythos Coworking - configuración de Express. El orden de los middlewares es importante:
 * 1. logging     -> registra toda petición, incluso las que terminan en error.
 * 2. seguridad   -> cabeceras de seguridad y CORS.
 * 3. express.json-> convierte el cuerpo JSON en req.body (máx. 100 KB).
 * 4. routers     -> un router por recurso bajo /api/v1.
 * 5. 404         -> ninguna ruta coincidió.
 * 6. errores     -> manejador global, siempre al final.
 */
export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 'loopback');

app.use(logging);
app.use(seguridad);
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => res.redirect(config.prefijoApi));
app.use(config.prefijoApi, apiRouter);

app.use(rutaNoEncontrada);
app.use(manejoErrores);
