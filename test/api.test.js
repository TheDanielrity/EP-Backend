/**
 * Pruebas de la capa HTTP (router + middlewares) sin bases de datos.
 * Verifican lo que ocurre ANTES de llegar a SQL Server / MongoDB:
 * validación (400), rutas inexistentes (404), métodos no permitidos (405),
 * JSON mal formado, cabeceras y health check degradado (503).
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { app } from '../src/app.js';

let servidor;
let base;

before(async () => {
    servidor = app.listen(0);
    await new Promise((resolve) => servidor.once('listening', resolve));
    base = `http://127.0.0.1:${servidor.address().port}/api/v1`;
});

after(() => new Promise((resolve) => servidor.close(resolve)));

const pedir = async (metodo, ruta, cuerpo, cabeceras = {}) => {
    const respuesta = await fetch(`${base}${ruta}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', ...cabeceras },
        body: typeof cuerpo === 'string' ? cuerpo : cuerpo && JSON.stringify(cuerpo)
    });
    const texto = await respuesta.text();
    return { estado: respuesta.status, cabeceras: respuesta.headers, json: texto ? JSON.parse(texto) : null };
};

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

describe('Sistema', () => {
    it('GET /api/v1 describe los recursos', async () => {
        const { estado, json } = await pedir('GET', '/');
        assert.equal(estado, 200);
        assert.equal(json.recursos.salas, '/api/v1/salas');
        assert.match(json.nombre, /Mythos/);
    });

    it('GET /salud responde 503 si las bases no están conectadas', async () => {
        const { estado, json } = await pedir('GET', '/salud');
        assert.equal(estado, 503);
        assert.deepEqual(json.servicios, { sqlServer: 'caido', mongodb: 'caido' });
    });

    it('agrega X-Request-Id y cabeceras de seguridad', async () => {
        const { cabeceras } = await pedir('GET', '/');
        assert.match(cabeceras.get('x-request-id'), /^[0-9a-f-]{36}$/);
        assert.equal(cabeceras.get('x-content-type-options'), 'nosniff');
        assert.equal(cabeceras.get('x-powered-by'), null);
    });

    it('sirve la especificación OpenAPI en YAML', async () => {
        const respuesta = await fetch(`${base}/openapi.yaml`);
        assert.equal(respuesta.status, 200);
        assert.match(await respuesta.text(), /^openapi: 3\.0\.3/);
    });

    it('sirve la interfaz Swagger UI en /docs', async () => {
        const respuesta = await fetch(`${base}/docs`);
        assert.equal(respuesta.status, 200);
        assert.match(respuesta.headers.get('content-type'), /text\/html/);
        assert.match(await respuesta.text(), /swagger-ui/);
    });

    it('responde 204 a la petición preflight OPTIONS (CORS)', async () => {
        const { estado } = await pedir('OPTIONS', '/salas');
        assert.equal(estado, 204);
    });
});

describe('Errores globales', () => {
    it('404 con formato uniforme para rutas inexistentes', async () => {
        const { estado, json } = await pedir('GET', '/no-existe');
        assert.equal(estado, 404);
        assert.equal(json.error, 'Not Found');
        assert.ok(json.idPeticion);
    });

    it('405 con cabecera Allow para métodos no soportados', async () => {
        const { estado, cabeceras } = await pedir('PATCH', '/salas');
        assert.equal(estado, 405);
        assert.equal(cabeceras.get('allow'), 'GET, POST');
    });

    it('400 cuando el JSON está mal formado', async () => {
        const { estado, json } = await pedir('POST', '/salas', '{"nombre": ');
        assert.equal(estado, 400);
        assert.equal(json.mensaje, 'El cuerpo debe contener un JSON válido');
    });

    it('400 cuando el cuerpo no es un objeto', async () => {
        const { estado } = await pedir('POST', '/salas', [1, 2]);
        assert.equal(estado, 400);
    });
});

describe('Validación de salas', () => {
    it('400 con el detalle de cada campo inválido', async () => {
        const { estado, json } = await pedir('POST', '/salas', { nombre: '', capacidad: 0, extra: true });
        assert.equal(estado, 400);
        const campos = json.detalles.map((d) => d.campo).sort();
        assert.deepEqual(campos, ['capacidad', 'extra', 'nombre']);
    });

    it('400 cuando el código no es UUID', async () => {
        const { estado, json } = await pedir('GET', '/salas/abc');
        assert.equal(estado, 400);
        assert.equal(json.detalles[0].campo, 'codigo');
    });

    it('400 cuando capacidadMinima no es entero', async () => {
        const { estado } = await pedir('GET', '/salas?capacidadMinima=muchos');
        assert.equal(estado, 400);
    });
});

describe('Validación de usuarios', () => {
    it('400 cuando el correo no es válido', async () => {
        const { estado, json } = await pedir('POST', '/usuarios', { nombres: 'Ana', correo: 'ana@' });
        assert.equal(estado, 400);
        assert.equal(json.detalles[0].campo, 'correo');
    });

    it('400 en PUT cuando faltan campos (reemplazo completo)', async () => {
        const { estado, json } = await pedir('PUT', `/usuarios/${UUID_A}`, { nombres: 'Ana' });
        assert.equal(estado, 400);
        assert.deepEqual(json.detalles.map((d) => d.campo), ['correo']);
    });
});

describe('Validación de reservas', () => {
    it('400 cuando fechaFin no es posterior a fechaInicio', async () => {
        const { estado, json } = await pedir('POST', '/reservas', {
            codigoSala: UUID_A,
            codigoUsuario: UUID_B,
            fechaInicio: '2026-12-01T10:00:00-05:00',
            fechaFin: '2026-12-01T09:00:00-05:00'
        });
        assert.equal(estado, 400);
        assert.equal(json.detalles[0].campo, 'fechaFin');
    });

    it('400 cuando faltan los códigos y las fechas', async () => {
        const { estado, json } = await pedir('POST', '/reservas', {});
        assert.equal(estado, 400);
        assert.equal(json.detalles.length, 4);
    });

    it('400 cuando el filtro desde/hasta está invertido', async () => {
        const { estado } = await pedir('GET', '/reservas?desde=2026-12-02&hasta=2026-12-01');
        assert.equal(estado, 400);
    });
});

describe('Validación de comentarios y logs', () => {
    it('400 cuando la calificación está fuera de 1..5', async () => {
        const { estado, json } = await pedir('POST', `/salas/${UUID_A}/comentarios`, {
            codigoUsuario: UUID_B, texto: 'Muy buena', calificacion: 9
        });
        assert.equal(estado, 400);
        assert.equal(json.detalles[0].campo, 'calificacion');
    });

    it('400 cuando el id de comentario no es ObjectId', async () => {
        const { estado } = await pedir('DELETE', `/salas/${UUID_A}/comentarios/123`);
        assert.equal(estado, 400);
    });

    it('400 cuando el límite de logs supera 100', async () => {
        const { estado } = await pedir('GET', '/logs?limite=1000');
        assert.equal(estado, 400);
    });

    it('503 al consultar logs si MongoDB no está disponible', async () => {
        const { estado } = await pedir('GET', '/logs');
        assert.equal(estado, 503);
    });
});
