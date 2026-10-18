/**
 * Ubicación de los scripts de SQL Server, que viven en su propio repositorio
 * (EP-Backend_BBDD). Por defecto se busca clonado junto a este repositorio:
 *
 *   carpeta/
 *   ├── EP-Backend/        <- este repositorio (API)
 *   └── EP-Backend_BBDD/   <- scripts DDL y DML
 *
 * Si está en otra carpeta, indicar su ruta en la variable BBDD_REPO del .env.
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CARPETAS_EN_ORDEN = ['DDL', 'DML'];

export const rutaRepoBbdd = () => path.resolve(
    process.env.BBDD_REPO || fileURLToPath(new URL('../../EP-Backend_BBDD', import.meta.url))
);

/** Scripts .sql en orden de ejecución: DDL/01..04 y luego DML/05 (orden por nombre). */
export const listarScriptsSql = async (raiz = rutaRepoBbdd()) => {
    const archivos = [];
    for (const carpeta of CARPETAS_EN_ORDEN) {
        let nombres;
        try {
            nombres = await readdir(path.join(raiz, carpeta));
        } catch {
            throw new Error(`No se encontró ${path.join(raiz, carpeta)}. Clona el repositorio EP-Backend_BBDD`
                + ' junto a este proyecto o indica su ruta en la variable BBDD_REPO del archivo .env');
        }
        archivos.push(...nombres.filter((n) => n.endsWith('.sql')).sort().map((n) => path.join(raiz, carpeta, n)));
    }
    return archivos;
};
