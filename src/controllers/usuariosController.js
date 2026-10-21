import { reservasRepository } from '../repositories/reservasRepository.js';
import { usuariosRepository } from '../repositories/usuariosRepository.js';
import { auditar, urlRecurso } from '../utils/auditoria.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';

const USUARIO_NO_ENCONTRADO = 'El usuario no existe';

export const usuariosController = {
    async listar(req, res) {
        res.json(await usuariosRepository.listar());
    },

    async obtener(req, res) {
        const usuario = await usuariosRepository.obtener(req.validado.params.codigo);
        if (!usuario) throw ErrorHttp.noEncontrado(USUARIO_NO_ENCONTRADO);
        res.json(usuario);
    },

    async crear(req, res) {
        const usuario = await usuariosRepository.crear(req.validado.body);
        void auditar(req, 'crear', 'usuario', usuario.codigo, { nombres: usuario.nombres });
        res.status(201).location(urlRecurso('usuarios', usuario.codigo)).json(usuario);
    },

    async actualizar(req, res) {
        const { codigo } = req.validado.params;
        const usuario = await usuariosRepository.actualizar(codigo, req.validado.body);
        if (!usuario) throw ErrorHttp.noEncontrado(USUARIO_NO_ENCONTRADO);
        void auditar(req, 'actualizar', 'usuario', codigo, { nombres: usuario.nombres });
        res.json(usuario);
    },

    async eliminar(req, res) {
        const { codigo } = req.validado.params;
        if (!(await usuariosRepository.eliminar(codigo))) throw ErrorHttp.noEncontrado(USUARIO_NO_ENCONTRADO);
        void auditar(req, 'eliminar', 'usuario', codigo);
        res.status(204).end();
    },

    async listarReservas(req, res) {
        const { codigo } = req.validado.params;
        if (!(await usuariosRepository.obtener(codigo))) throw ErrorHttp.noEncontrado(USUARIO_NO_ENCONTRADO);
        res.json(await reservasRepository.listar({ codigoUsuario: codigo }));
    }
};
