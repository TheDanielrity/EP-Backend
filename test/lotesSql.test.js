/** Pruebas del divisor de lotes usado por npm run db:setup. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { listarScriptsSql, rutaRepoBbdd } from '../scripts/scriptsBbdd.js';
import { dividirEnLotes } from '../src/utils/lotesSql.js';

// Los scripts SQL están en el repositorio EP-Backend_BBDD: la última prueba solo corre si está clonado al lado.
const sinRepoBbdd = !existsSync(rutaRepoBbdd()) && 'el repositorio EP-Backend_BBDD no está clonado junto a este';

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

    it('cada procedimiento de los scripts queda al inicio de su propio lote', { skip: sinRepoBbdd }, async () => {
        const archivos = await listarScriptsSql();
        const textos = await Promise.all(archivos.map((archivo) => readFile(archivo, 'utf8')));
        const script = textos.map((texto) => texto.replace(/^﻿/, '')).join('\n');
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
