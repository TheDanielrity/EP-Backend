import { Router } from 'express';
import { usuariosController } from '../controllers/usuariosController.js';
import { metodoNoPermitido } from '../middlewares/manejoErrores.js';
import { validarActualizacionUsuario, validarCodigo, validarUsuario } from '../middlewares/validacion.js';

export const usuariosRouter = Router();

usuariosRouter.route('/')
    .get(usuariosController.listar)
    .post(validarUsuario, usuariosController.crear)
    .all(metodoNoPermitido(['GET', 'POST']));

usuariosRouter.route('/:codigo')
    .get(validarCodigo, usuariosController.obtener)
    .put(validarActualizacionUsuario, usuariosController.actualizar)
    .delete(validarCodigo, usuariosController.eliminar)
    .all(metodoNoPermitido(['GET', 'PUT', 'DELETE']));

usuariosRouter.route('/:codigo/reservas')
    .get(validarCodigo, usuariosController.listarReservas)
    .all(metodoNoPermitido(['GET']));
