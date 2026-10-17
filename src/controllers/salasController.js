import { estaConectadoMongo } from '../db/mongodb.js';
import { comentariosRepository } from '../repositories/comentariosRepository.js';
import { reservasRepository } from '../repositories/reservasRepository.js';
import { salasRepository } from '../repositories/salasRepository.js';
import { auditar, urlRecurso } from '../utils/auditoria.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';

const SALA_NO_ENCONTRADA = 'La sala no existe';

/** Une el dato transaccional (SQL) con la valoración de los comentarios (MongoDB). */
const valoracionDe = async (codigo) => {
    if (!estaConectadoMongo()) return null;
    try {
        return await comentariosRepository.resumenSala(codigo);
    } catch {
        return null;
    }
};

export const salasController = {
    async listar(req, res) {
        res.json(await salasRepository.listar(req.validado.query));
    },

    async obtener(req, res) {
        const sala = await salasRepository.obtener(req.validado.params.codigo);
        if (!sala) throw ErrorHttp.noEncontrado(SALA_NO_ENCONTRADA);
        res.json({ ...sala, valoracion: await valoracionDe(sala.codigo) });
    },

    async crear(req, res) {
        const sala = await salasRepository.crear(req.validado.body);
        void auditar(req, 'crear', 'sala', sala.codigo, req.validado.body);
        res.status(201).location(urlRecurso('salas', sala.codigo)).json(sala);
    },

    async actualizar(req, res) {
        const { codigo } = req.validado.params;
        const sala = await salasRepository.actualizar(codigo, req.validado.body);
        if (!sala) throw ErrorHttp.noEncontrado(SALA_NO_ENCONTRADA);
        void auditar(req, 'actualizar', 'sala', codigo, req.validado.body);
        res.json(sala);
    },

    async eliminar(req, res) {
        const { codigo } = req.validado.params;
        if (!(await salasRepository.eliminar(codigo))) throw ErrorHttp.noEncontrado(SALA_NO_ENCONTRADA);
        void auditar(req, 'eliminar', 'sala', codigo);
        res.status(204).end();
    },

    async listarReservas(req, res) {
        const { codigo } = req.validado.params;
        if (!(await salasRepository.obtener(codigo))) throw ErrorHttp.noEncontrado(SALA_NO_ENCONTRADA);
        res.json(await reservasRepository.listar({ codigoSala: codigo }));
    }
};
