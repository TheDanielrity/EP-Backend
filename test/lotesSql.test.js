/** Pruebas del divisor de lotes usado por npm run db:setup. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { dividirEnLotes } from '../src/utils/lotesSql.js';

describe('dividirEnLotes', () => {
    it('separa por GO sin importar mayúsculas ni CRLF', () => {
        const lotes = dividirEnLotes('SELECT 1;\r\nGO\r\nSELECT 2;\r\ngo\r\n');
        assert.deepEqual(lotes, ['SELECT 1;', 'SELECT 2;']);
    });

    it('descarta lotes que solo tienen comentarios', () => {
        const lotes = dividirEnLotes('/* encabezado */\n-- nota\nGO\nSELECT 1;');
        assert.deepEqual(lotes, ['SELECT 1;']);
    });

    it('no corta palabras que contienen GO', () => {
        const lotes = dividirEnLotes("SELECT 'GOOD' AS go_col;\nGO");
        assert.equal(lotes.length, 1);
    });

    it('cada procedimiento del script queda al inicio de su propio lote', async () => {
        const script = await readFile(new URL('../database/sqlserver.sql', import.meta.url), 'utf8');
        // SQL Server admite comentarios antes de la instrucción: se ignoran al comparar.
        const sinComentarios = (l) => l.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*--.*$/gm, '').trim();
        const lotes = dividirEnLotes(script).map(sinComentarios);
        const procedimientos = lotes.filter((l) => /CREATE OR ALTER PROCEDURE/i.test(l));
        assert.equal(procedimientos.length, 2);
        for (const lote of procedimientos) assert.match(lote, /^CREATE OR ALTER PROCEDURE/i);
        assert.ok(lotes.some((l) => /CREATE DATABASE/i.test(l)));
        assert.ok(lotes.some((l) => /^CREATE VIEW/i.test(l)));
    });
});
