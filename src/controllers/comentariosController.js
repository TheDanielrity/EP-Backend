import { estaConectadoMongo } from '../db/mongodb.js';
import { comentariosRepository } from '../repositories/comentariosRepository.js';
import { salasRepository } from '../repositories/salasRepository.js';
import { usuariosRepository } from '../repositories/usuariosRepository.js';
import { auditar, urlRecurso } from '../utils/auditoria.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';

const exigirMongo = () => {
    if (!estaConectadoMongo()) throw new ErrorHttp(503, 'El servicio de comentarios (MongoDB) no está disponible');
};

/** Integridad entre bases: la sala debe existir en SQL Server antes de comentar en MongoDB. */
const exigirSala = async (codigo) => {
    if (!(await salasRepository.obtener(codigo))) throw ErrorHttp.noEncontrado('La sala no existe');
};

export const comentariosController = {
    async listar(req, res) {
        exigirMongo();
        const { codigo } = req.validado.params;
        await exigirSala(codigo);
        res.json(await comentariosRepository.listarPorSala(codigo));
    },

    async crear(req, res) {
        exigirMongo();
        const { codigo } = req.validado.params;
        const { codigoUsuario, texto, calificacion, etiquetas } = req.validado.body;

        await exigirSala(codigo);
        const usuario = await usuariosRepository.obtener(codigoUsuario);
        if (!usuario) throw ErrorHttp.noEncontrado('El usuario no existe');

        const comentario = await comentariosRepository.crear({
            codigoSala: codigo,
            autor: { codigoUsuario, nombres: usuario.nombres },
            texto,
            calificacion,
            etiquetas
        });
        void auditar(req, 'crear', 'comentario', comentario._id, { codigoSala: codigo, calificacion });
        res.status(201)
            .location(urlRecurso('salas', codigo, 'comentarios', comentario._id))
            .json(comentario);
    },

    async eliminar(req, res) {
        exigirMongo();
        const { codigo, idComentario } = req.validado.params;
        if (!(await comentariosRepository.eliminar(codigo, idComentario))) {
            throw ErrorHttp.noEncontrado('El comentario no existe');
        }
        void auditar(req, 'eliminar', 'comentario', idComentario, { codigoSala: codigo });
        res.status(204).end();
    }
};
