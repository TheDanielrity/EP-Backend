import { config } from '../config/env.js';
import { logsRepository } from '../repositories/logsRepository.js';

/** URL canónica de un recurso, usada en la cabecera Location de las respuestas 201. */
export const urlRecurso = (...segmentos) => [config.prefijoApi, ...segmentos].join('/');

/** Guarda en MongoDB un evento de auditoría (quién cambió qué y cuándo). */
export const auditar = (req, accion, entidad, codigo, cambios) => logsRepository.registrar('auditoria', {
    idPeticion: req.id,
    accion,
    entidad,
    codigo: String(codigo),
    ...(cambios && { cambios })
});
