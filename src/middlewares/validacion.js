import { ErrorHttp } from '../utils/ErrorHttp.js';

/**
 * Middleware de validación declarativo.
 *
 * Cada regla recibe el valor y devuelve { valor } (ya normalizado) o { error }.
 * `validar({ params, query, body })` revisa cada origen, acumula TODOS los
 * errores en `detalles` y, si no hay errores, deja los datos limpios en
 * `req.validado` para que el controlador no vuelva a validarlos.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/;

const ok = (valor) => ({ valor });
const falla = (error) => ({ error });

export const reglas = {
    texto: (max) => (v) => (typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max
        ? ok(v.trim())
        : falla(`debe ser un texto no vacío de máximo ${max} caracteres`)),

    entero: ({ min = 1, max = 2147483647 } = {}) => (v) => (Number.isInteger(v) && v >= min && v <= max
        ? ok(v)
        : falla(`debe ser un número entero entre ${min} y ${max}`)),

    /** Para query strings: convierte el texto a entero antes de validar. */
    enteroTexto: ({ min = 1, max = 2147483647 } = {}) => (v) => {
        const numero = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : Number.NaN;
        return Number.isInteger(numero) && numero >= min && numero <= max
            ? ok(numero)
            : falla(`debe ser un número entero entre ${min} y ${max}`);
    },

    correo: (v) => (typeof v === 'string' && v.trim().length <= 150 && CORREO.test(v.trim())
        ? ok(v.trim().toLowerCase())
        : falla('debe ser un correo electrónico válido de máximo 150 caracteres')),

    uuid: (v) => (typeof v === 'string' && UUID.test(v)
        ? ok(v.toLowerCase())
        : falla('debe ser un UUID válido')),

    objectId: (v) => (typeof v === 'string' && OBJECT_ID.test(v)
        ? ok(v)
        : falla('debe ser un identificador de MongoDB válido (24 caracteres hexadecimales)')),

    fecha: (v) => (typeof v === 'string' && FECHA_ISO.test(v) && Number.isFinite(Date.parse(v))
        ? ok(v)
        : falla('debe ser una fecha ISO 8601 válida, por ejemplo 2026-10-20T09:00:00-05:00')),

    enumeracion: (valores) => (v) => (valores.includes(v)
        ? ok(v)
        : falla(`debe ser uno de: ${valores.join(', ')}`)),

    listaTextos: ({ maxElementos = 5, maxLargo = 30 } = {}) => (v) => (
        Array.isArray(v) && v.length <= maxElementos &&
        v.every((t) => typeof t === 'string' && t.trim().length > 0 && t.trim().length <= maxLargo)
            ? ok(v.map((t) => t.trim().toLowerCase()))
            : falla(`debe ser una lista de hasta ${maxElementos} textos de máximo ${maxLargo} caracteres`)),

    /** Envuelve una regla para que el campo sea opcional. */
    opcional: (regla) => Object.assign((v) => (v === undefined ? ok(undefined) : regla(v)), { opcional: true })
};

const validarOrigen = (esquema, datos, origen, detalles, permitirExtras) => {
    const limpio = {};
    for (const [campo, regla] of Object.entries(esquema)) {
        const valor = datos[campo];
        if (valor === undefined && !regla.opcional) {
            detalles.push({ campo, origen, mensaje: 'es obligatorio' });
            continue;
        }
        const resultado = regla(valor);
        if (resultado.error) detalles.push({ campo, origen, mensaje: resultado.error });
        else if (resultado.valor !== undefined) limpio[campo] = resultado.valor;
    }
    if (!permitirExtras) {
        for (const campo of Object.keys(datos)) {
            if (!(campo in esquema)) detalles.push({ campo, origen, mensaje: 'no es un campo permitido' });
        }
    }
    return limpio;
};

/**
 * @param {{ params?: object, query?: object, body?: object, reglasCruzadas?: Function }} esquemas
 */
export const validar = (esquemas) => (req, res, next) => {
    const detalles = [];
    const validado = { params: {}, query: {}, body: {} };

    if (esquemas.params) {
        validado.params = validarOrigen(esquemas.params, req.params ?? {}, 'params', detalles, true);
    }
    if (esquemas.query) {
        validado.query = validarOrigen(esquemas.query, req.query ?? {}, 'query', detalles, false);
    }
    if (esquemas.body) {
        const cuerpo = req.body ?? {};
        if (typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
            return next(ErrorHttp.solicitudInvalida('El cuerpo de la petición debe ser un objeto JSON'));
        }
        validado.body = validarOrigen(esquemas.body, cuerpo, 'body', detalles, false);
    }

    if (detalles.length === 0 && esquemas.reglasCruzadas) {
        detalles.push(...esquemas.reglasCruzadas(validado));
    }

    if (detalles.length > 0) {
        return next(ErrorHttp.solicitudInvalida('Los datos enviados no son válidos', detalles));
    }

    req.validado = validado;
    next();
};

/* ---------- Esquemas por recurso ---------- */

const { texto, entero, enteroTexto, correo, uuid, objectId, fecha, enumeracion, listaTextos, opcional } = reglas;

const fechasEnOrden = (inicio, fin, campoFin, origen) => (inicio && fin && Date.parse(fin) <= Date.parse(inicio)
    ? [{ campo: campoFin, origen, mensaje: 'debe ser posterior a la fecha de inicio' }]
    : []);

export const validarCodigo = validar({ params: { codigo: uuid } });

export const validarConsultaSalas = validar({ query: { capacidadMinima: opcional(enteroTexto()) } });

export const validarSala = validar({
    body: { nombre: texto(100), capacidad: entero({ min: 1, max: 500 }) }
});

export const validarActualizacionSala = validar({
    params: { codigo: uuid },
    body: { nombre: texto(100), capacidad: entero({ min: 1, max: 500 }) }
});

export const validarUsuario = validar({ body: { nombres: texto(100), correo } });

export const validarActualizacionUsuario = validar({
    params: { codigo: uuid },
    body: { nombres: texto(100), correo }
});

const cuerpoReserva = { codigoSala: uuid, codigoUsuario: uuid, fechaInicio: fecha, fechaFin: fecha };
const reservaCruzada = ({ body }) => fechasEnOrden(body.fechaInicio, body.fechaFin, 'fechaFin', 'body');

export const validarReserva = validar({ body: cuerpoReserva, reglasCruzadas: reservaCruzada });

export const validarActualizacionReserva = validar({
    params: { codigo: uuid },
    body: cuerpoReserva,
    reglasCruzadas: reservaCruzada
});

export const validarConsultaReservas = validar({
    query: {
        codigoSala: opcional(uuid),
        codigoUsuario: opcional(uuid),
        desde: opcional(fecha),
        hasta: opcional(fecha)
    },
    reglasCruzadas: ({ query }) => fechasEnOrden(query.desde, query.hasta, 'hasta', 'query')
});

export const validarComentario = validar({
    params: { codigo: uuid },
    body: {
        codigoUsuario: uuid,
        texto: texto(500),
        calificacion: entero({ min: 1, max: 5 }),
        etiquetas: opcional(listaTextos())
    }
});

export const validarCodigoComentario = validar({ params: { codigo: uuid, idComentario: objectId } });

export const validarConsultaLogs = validar({
    query: {
        tipo: opcional(texto(30)),
        nivel: opcional(enumeracion(['info', 'warn', 'error'])),
        desde: opcional(fecha),
        hasta: opcional(fecha),
        pagina: opcional(enteroTexto({ min: 1, max: 100000 })),
        limite: opcional(enteroTexto({ min: 1, max: 100 }))
    },
    reglasCruzadas: ({ query }) => fechasEnOrden(query.desde, query.hasta, 'hasta', 'query')
});
