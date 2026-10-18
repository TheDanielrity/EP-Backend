/**
 * npm run db:setup
 *
 * Prepara las dos bases de datos de Mythos Coworking sin abrir SSMS:
 *   1. SQL Server: ejecuta en orden los scripts del repositorio EP-Backend_BBDD
 *      (DDL/01 a DDL/04 y DML/05: base, tablas, restricciones, índices, vista,
 *      procedimientos y datos de ejemplo). Ver scripts/scriptsBbdd.js.
 *   2. MongoDB: crea las colecciones con su validador y sus índices.
 *
 * Usa las credenciales del archivo .env. Es re-ejecutable: vuelve a crear el
 * esquema SQL desde cero (borra los datos anteriores).
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sql from 'mssql';
import { config, validarConfig } from '../src/config/env.js';
import { cerrarMongo, conectarMongo } from '../src/db/mongodb.js';
import { dividirEnLotes } from '../src/utils/lotesSql.js';
import { listarScriptsSql, rutaRepoBbdd } from './scriptsBbdd.js';

const NOMBRE_EN_SCRIPT = 'MythosReservasDB';

const conexionSql = (database) => ({
    server: config.sql.server,
    port: config.sql.port,
    database,
    user: config.sql.user,
    password: config.sql.password,
    pool: { max: 1, min: 0 },
    options: {
        encrypt: config.sql.encrypt,
        trustServerCertificate: config.sql.trustServerCertificate,
        useUTC: true
    },
    requestTimeout: 60000
});

const ejecutarLotes = async (pool, lotes) => {
    let ultimoResultado;
    for (const [indice, lote] of lotes.entries()) {
        try {
            ultimoResultado = await pool.request().batch(lote);
        } catch (error) {
            const inicio = lote.split('\n').find((l) => l.trim() && !l.trim().startsWith('--'))?.trim();
            throw new Error(`Falló el lote ${indice + 1} ("${inicio?.slice(0, 60)}..."): ${error.message}`);
        }
    }
    return ultimoResultado;
};

const prepararSqlServer = async () => {
    const baseDatos = config.sql.database;
    const archivos = await listarScriptsSql();
    console.log(`[SQL Server] Scripts de ${rutaRepoBbdd()}:`);
    const lotes = [];
    for (const archivo of archivos) {
        console.log(`  - ${path.relative(rutaRepoBbdd(), archivo)}`);
        // Sin la marca BOM (UTF-8) que se agrega para que SSMS lea bien las tildes.
        const script = (await readFile(archivo, 'utf8')).replace(/^﻿/, '').replaceAll(NOMBRE_EN_SCRIPT, baseDatos);
        lotes.push(...dividirEnLotes(script));
    }

    // El lote de CREATE DATABASE se ejecuta en master; el lote USE se omite porque
    // el resto se ejecuta con una conexión abierta directamente en la base nueva.
    const lotesMaster = lotes.filter((l) => /CREATE\s+DATABASE/i.test(l));
    const lotesBase = lotes.filter((l) => !/CREATE\s+DATABASE/i.test(l) && !/^USE\s+/im.test(l));

    console.log(`[SQL Server] Conectando a ${config.sql.server}:${config.sql.port}...`);
    const master = await new sql.ConnectionPool(conexionSql('master')).connect();
    try {
        await ejecutarLotes(master, lotesMaster);
        console.log(`[SQL Server] Base ${baseDatos} lista.`);
    } finally {
        await master.close();
    }

    const base = await new sql.ConnectionPool(conexionSql(baseDatos)).connect();
    try {
        const resultado = await ejecutarLotes(base, lotesBase);
        console.log(`[SQL Server] ${lotesBase.length} lotes ejecutados: tablas, índices, vista, procedimientos y datos de ejemplo.`);
        if (resultado?.recordset) console.table(resultado.recordset);
    } finally {
        await base.close();
    }
};

const prepararMongo = async () => {
    console.log(`[MongoDB] Conectando a ${config.mongo.uri}...`);
    await conectarMongo();
    console.log(`[MongoDB] Base ${config.mongo.database} lista: colecciones logs y comentarios con validadores e índices.`);
    await cerrarMongo();
};

try {
    validarConfig();
    await prepararSqlServer();
    await prepararMongo();
    console.log('\nBases de datos listas. Ahora ejecuta: npm run dev');
} catch (error) {
    console.error('\nNo se pudo preparar la base de datos:', error.message);
    console.error('Revisa que SQL Server y MongoDB estén encendidos y los datos del archivo .env.');
    process.exitCode = 1;
    await cerrarMongo().catch(() => {});
}
