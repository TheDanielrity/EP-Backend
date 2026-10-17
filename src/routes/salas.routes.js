import { Router } from 'express';
import { comentariosController } from '../controllers/comentariosController.js';
import { salasController } from '../controllers/salasController.js';
import { metodoNoPermitido } from '../middlewares/manejoErrores.js';
import {
    validarActualizacionSala, validarCodigo, validarCodigoComentario,
    validarComentario, validarConsultaSalas, validarSala
} from '../middlewares/validacion.js';

export const salasRouter = Router();

salasRouter.route('/')
    .get(validarConsultaSalas, salasController.listar)
    .post(validarSala, salasController.crear)
    .all(metodoNoPermitido(['GET', 'POST']));

salasRouter.route('/:codigo')
    .get(validarCodigo, salasController.obtener)
    .put(validarActualizacionSala, salasController.actualizar)
    .delete(validarCodigo, salasController.eliminar)
    .all(metodoNoPermitido(['GET', 'PUT', 'DELETE']));

// Sub-recursos: reservas de la sala (SQL Server) y comentarios (MongoDB).
salasRouter.route('/:codigo/reservas')
    .get(validarCodigo, salasController.listarReservas)
    .all(metodoNoPermitido(['GET']));

salasRouter.route('/:codigo/comentarios')
    .get(validarCodigo, comentariosController.listar)
    .post(validarComentario, comentariosController.crear)
    .all(metodoNoPermitido(['GET', 'POST']));

salasRouter.route('/:codigo/comentarios/:idComentario')
    .delete(validarCodigoComentario, comentariosController.eliminar)
    .all(metodoNoPermitido(['DELETE']));
