import { reservasRepository } from '../repositories/reservasRepository.js';
import { auditar, urlRecurso } from '../utils/auditoria.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';

const RESERVA_NO_ENCONTRADA = 'La reserva no existe';

export const reservasController = {
    async listar(req, res) {
        res.json(await reservasRepository.listar(req.validado.query));
    },

    async obtener(req, res) {
        const reserva = await reservasRepository.obtener(req.validado.params.codigo);
        if (!reserva) throw ErrorHttp.noEncontrado(RESERVA_NO_ENCONTRADA);
        res.json(reserva);
    },

    /** Usa el procedimiento almacenado dbo.RegistrarReserva (transacción + control de solapamiento). */
    async crear(req, res) {
        const reserva = await reservasRepository.crear(req.validado.body);
        void auditar(req, 'crear', 'reserva', reserva.codigo, req.validado.body);
        res.status(201).location(urlRecurso('reservas', reserva.codigo)).json(reserva);
    },

    /** Usa dbo.ActualizarReserva; el procedimiento lanza 50005 si la reserva no existe. */
    async actualizar(req, res) {
        const { codigo } = req.validado.params;
        const reserva = await reservasRepository.actualizar(codigo, req.validado.body);
        void auditar(req, 'actualizar', 'reserva', codigo, req.validado.body);
        res.json(reserva);
    },

    async eliminar(req, res) {
        const { codigo } = req.validado.params;
        if (!(await reservasRepository.eliminar(codigo))) throw ErrorHttp.noEncontrado(RESERVA_NO_ENCONTRADA);
        void auditar(req, 'cancelar', 'reserva', codigo);
        res.status(204).end();
    }
};
