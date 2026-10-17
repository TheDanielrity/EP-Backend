/**
 * Error de dominio con un código de estado HTTP asociado.
 * Los controladores y middlewares lanzan este error y el manejador global
 * lo convierte en una respuesta JSON uniforme.
 */
export class ErrorHttp extends Error {
    constructor(estado, mensaje, detalles) {
        super(mensaje);
        this.name = 'ErrorHttp';
        this.estado = estado;
        if (detalles) this.detalles = detalles;
    }

    static solicitudInvalida(mensaje, detalles) {
        return new ErrorHttp(400, mensaje, detalles);
    }

    static noEncontrado(mensaje = 'Recurso no encontrado') {
        return new ErrorHttp(404, mensaje);
    }

    static conflicto(mensaje) {
        return new ErrorHttp(409, mensaje);
    }
}
