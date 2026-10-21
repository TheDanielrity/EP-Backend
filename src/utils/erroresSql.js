/**
 * Traduce los errores de SQL Server a códigos HTTP.
 *
 * - 50001..50005: errores de negocio lanzados con THROW en los procedimientos.
 * - 2601 / 2627: violación de índice UNIQUE (dato duplicado).
 * - 547: violación de FOREIGN KEY o CHECK (integridad referencial).
 */
const ERRORES_NEGOCIO = Object.freeze({
    50001: 400, // Fechas inválidas
    50002: 404, // La sala no existe
    50003: 404, // El usuario no existe
    50004: 409, // Horario ocupado
    50005: 404 // La reserva no existe
});

const MENSAJES_DUPLICADO = Object.freeze({
    UQ_Usuarios_correo: 'El correo ya está registrado',
    UQ_Salas_nombre: 'Ya existe una sala con ese nombre'
});

export const numeroErrorSql = (error) => error?.number ?? error?.originalError?.info?.number;

/**
 * @returns {{ estado: number, mensaje: string } | null} null si no es un error SQL conocido.
 */
export const mapearErrorSql = (error) => {
    const numero = numeroErrorSql(error);
    if (numero === undefined) return null;

    if (ERRORES_NEGOCIO[numero]) {
        return { estado: ERRORES_NEGOCIO[numero], mensaje: error.message };
    }

    if (numero === 2601 || numero === 2627) {
        const restriccion = Object.keys(MENSAJES_DUPLICADO).find((nombre) => error.message?.includes(nombre));
        return { estado: 409, mensaje: MENSAJES_DUPLICADO[restriccion] ?? 'El registro ya existe' };
    }

    if (numero === 547) {
        return {
            estado: 409,
            mensaje: 'La operación viola la integridad referencial: el recurso tiene registros asociados'
        };
    }

    return null;
};
