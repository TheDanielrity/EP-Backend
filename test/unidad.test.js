/** Pruebas unitarias de utilidades: traducción de errores SQL y reglas de validación. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { reglas } from '../src/middlewares/validacion.js';
import { mapearErrorSql } from '../src/utils/erroresSql.js';

describe('mapearErrorSql', () => {
    const casos = [
        [50001, 400], [50002, 404], [50003, 404], [50004, 409], [50005, 404], [547, 409]
    ];
    for (const [numero, estado] of casos) {
        it(`error ${numero} -> HTTP ${estado}`, () => {
            assert.equal(mapearErrorSql({ number: numero, message: 'x' }).estado, estado);
        });
    }

    it('identifica el índice UNIQUE violado', () => {
        const error = { number: 2627, message: "Violation of UNIQUE KEY constraint 'UQ_Usuarios_correo'." };
        assert.deepEqual(mapearErrorSql(error), { estado: 409, mensaje: 'El correo ya está registrado' });
    });

    it('lee el número desde originalError (driver mssql)', () => {
        const error = { originalError: { info: { number: 50004 } }, message: 'ocupada' };
        assert.equal(mapearErrorSql(error).estado, 409);
    });

    it('devuelve null para errores que no son de SQL', () => {
        assert.equal(mapearErrorSql(new Error('otro')), null);
    });
});

describe('reglas de validación', () => {
    it('texto recorta espacios y respeta el máximo', () => {
        assert.deepEqual(reglas.texto(5)('  hola '), { valor: 'hola' });
        assert.ok(reglas.texto(5)('demasiado largo').error);
    });

    it('correo se normaliza a minúsculas', () => {
        assert.deepEqual(reglas.correo(' Ana@Mail.COM '), { valor: 'ana@mail.com' });
    });

    it('entero rechaza decimales y textos', () => {
        assert.ok(reglas.entero()(2.5).error);
        assert.ok(reglas.entero()('3').error);
        assert.deepEqual(reglas.entero({ min: 1, max: 5 })(5), { valor: 5 });
    });

    it('fecha exige formato ISO 8601', () => {
        assert.ok(reglas.fecha('15/10/2026').error);
        assert.deepEqual(reglas.fecha('2026-10-15T09:00:00-05:00'), { valor: '2026-10-15T09:00:00-05:00' });
    });

    it('opcional acepta undefined', () => {
        assert.deepEqual(reglas.opcional(reglas.uuid)(undefined), { valor: undefined });
    });
});
