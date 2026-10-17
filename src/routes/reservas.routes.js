import { Router } from 'express';
import { reservasController } from '../controllers/reservasController.js';
import { metodoNoPermitido } from '../middlewares/manejoErrores.js';
import {
    validarActualizacionReserva, validarCodigo, validarConsultaReservas, validarReserva
} from '../middlewares/validacion.js';

export const reservasRouter = Router();

reservasRouter.route('/')
    .get(validarConsultaReservas, reservasController.listar)
    .post(validarReserva, reservasController.crear)
    .all(metodoNoPermitido(['GET', 'POST']));

reservasRouter.route('/:codigo')
    .get(validarCodigo, reservasController.obtener)
    .put(validarActualizacionReserva, reservasController.actualizar)
    .delete(validarCodigo, reservasController.eliminar)
    .all(metodoNoPermitido(['GET', 'PUT', 'DELETE']));
