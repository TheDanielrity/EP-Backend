const textoValido = (valor) => typeof valor === 'string' && valor.trim().length > 0;
const codigoValido = (valor) => typeof valor === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);

const rechazar = (mensaje, next) => {
    const error = new Error(mensaje);
    error.status = 400;
    next(error);
};

export const validarSala = (req, res, next) => {
    const { nombre, capacidad } = req.body ?? {};
    if (!textoValido(nombre) || nombre.trim().length > 100 ||
        !Number.isInteger(capacidad) || capacidad <= 0 || capacidad > 2147483647) {
        return rechazar('Se requiere nombre y capacidad como entero positivo', next);
    }
    next();
};

export const validarUsuario = (req, res, next) => {
    const { nombres, correo } = req.body ?? {};
    if (!textoValido(nombres) || nombres.trim().length > 100 || !textoValido(correo) ||
        correo.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        return rechazar('Se requiere nombres y un correo válido', next);
    }
    next();
};

export const validarReserva = (req, res, next) => {
    const { codigoSala, codigoUsuario, fechaInicio, fechaFin } = req.body ?? {};
    if (!codigoValido(codigoSala) || !codigoValido(codigoUsuario)) {
        return rechazar('codigoSala y codigoUsuario deben ser UUID válidos', next);
    }
    if (!textoValido(fechaInicio) || !textoValido(fechaFin) ||
        !Number.isFinite(Date.parse(fechaInicio)) || !Number.isFinite(Date.parse(fechaFin)) ||
        Date.parse(fechaFin) <= Date.parse(fechaInicio)) {
        return rechazar('Se requieren fechas válidas y fechaFin posterior a fechaInicio', next);
    }
    next();
};
