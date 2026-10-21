import { Router } from 'express';
import { documentacionController } from '../controllers/documentacionController.js';
import { sistemaController } from '../controllers/sistemaController.js';
import { metodoNoPermitido } from '../middlewares/manejoErrores.js';
import { validarConsultaLogs } from '../middlewares/validacion.js';
import { reservasRouter } from './reservas.routes.js';
import { salasRouter } from './salas.routes.js';
import { usuariosRouter } from './usuarios.routes.js';

/** Router principal de la versión 1 de la API: agrupa un router por recurso. */
export const apiRouter = Router();

apiRouter.get('/', sistemaController.indice);
apiRouter.get('/salud', sistemaController.salud);

// Documentación OpenAPI 3: especificación en YAML e interfaz Swagger UI.
apiRouter.get('/openapi.yaml', documentacionController.especificacion);
apiRouter.get('/docs', documentacionController.interfaz);

apiRouter.use('/salas', salasRouter);
apiRouter.use('/usuarios', usuariosRouter);
apiRouter.use('/reservas', reservasRouter);

apiRouter.route('/logs')
    .get(validarConsultaLogs, sistemaController.listarLogs)
    .all(metodoNoPermitido(['GET']));
apiRouter.route('/logs/resumen')
    .get(sistemaController.resumenLogs)
    .all(metodoNoPermitido(['GET']));
