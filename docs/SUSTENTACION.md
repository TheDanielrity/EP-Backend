# Guía de sustentación · Mythos Coworking API

## 1. Guion de demostración (5–7 minutos)

| # | Acción | Qué se demuestra | Criterio de la rúbrica |
| --- | --- | --- | --- |
| 0 | `npm run db:setup` | Un solo comando crea la base SQL (tablas, SP, datos) y prepara MongoDB | SQL / NoSQL |
| 1 | Mostrar `.env.example`, `package.json` (scripts) y `npm run dev` | Entorno profesional; el servidor valida variables y conecta a ambas bases | Arquitectura |
| 2 | Abrir `src/app.js` y `src/routes/` | Orden de middlewares y un `Router` por recurso | Arquitectura |
| 3 | `GET /api/v1/salud` | Health check de SQL Server y MongoDB | Arquitectura |
| 3b | Abrir `http://localhost:3000/api/v1/docs` | Contrato OpenAPI 3 en Swagger UI: todos los endpoints, esquemas y códigos; se puede probar con *Try it out* | API REST / Documentación |
| 4 | `POST /salas` y `POST /usuarios` | `201 Created` + cabecera `Location` | API REST |
| 5 | `POST /salas` con `{ "nombre": "", "capacidad": 0 }` | `400` con detalle por campo (middleware de validación) | API REST / Middlewares |
| 6 | `POST /reservas` y repetir el mismo horario | `201` y luego `409` (SP con transacción y bloqueo) | SQL |
| 7 | `DELETE /salas/{codigo}` de una sala con reservas | `409`: la FK protege la integridad referencial | SQL |
| 8 | `PATCH /salas` | `405` con cabecera `Allow` | API REST |
| 9 | `POST /salas/{codigo}/comentarios` y `GET /salas/{codigo}` | Comentario en MongoDB + promedio unido al dato SQL | NoSQL |
| 10 | `GET /logs?tipo=auditoria` y `GET /logs/resumen` | Logs con esquema flexible, índices y agregación | NoSQL |
| 11 | En Compass: `db.logs.getIndexes()` y un documento de cada tipo | Diseño óptimo: TTL + índices compuestos; distintas formas de `datos` | NoSQL |
| 12 | En SSMS: diagrama / `sp_helpconstraint 'dbo.Reservas'` | PK, FK, UNIQUE, CHECK con nombre (3FN) | SQL |

Tip: ejecutar `request.http` de arriba hacia abajo o la colección de Postman con *Run collection*;
los códigos generados se guardan solos en variables.

## 2. Preguntas frecuentes del jurado

**¿Por qué el SP y no un INSERT directo para las reservas?**
Porque la verificación de disponibilidad y la inserción deben ser atómicas. El SP abre una transacción,
bloquea la fila de la sala (`UPDLOCK, HOLDLOCK`) y así dos peticiones simultáneas no pueden reservar el
mismo horario. Si algo falla, `XACT_ABORT` + `CATCH` hacen ROLLBACK.

**¿Cómo se detecta un solapamiento?**
Dos intervalos se cruzan si `inicioExistente < finNuevo` **y** `finExistente > inicioNuevo`. Una reserva
de 10:00 a 11:00 y otra de 11:00 a 12:00 no se cruzan (se permiten reservas consecutivas).

**¿Por qué está en 3FN?**
Cada tabla describe una sola entidad, la clave es simple (no hay dependencias parciales) y `Reservas` no
repite datos de salas o usuarios: solo guarda sus claves foráneas. Los nombres se obtienen con la vista
`vw_ReservasDetalle`.

**¿Qué significa "esquema flexible" en los logs?**
Todos los documentos comparten `tipo`, `nivel` y `fecha` (validados con `$jsonSchema`), pero `datos`
tiene una forma distinta según el evento (petición, auditoría, error, sistema). Agregar un nuevo tipo de
evento no requiere migrar nada.

**¿Por qué el nombre del autor se repite en los comentarios?**
Es desnormalización intencional en NoSQL: se optimiza la lectura (se listan comentarios sin consultar SQL
Server). La fuente de verdad sigue siendo la tabla `Usuarios`.

**¿Qué pasa si MongoDB se cae mientras la API funciona?**
Las reservas siguen funcionando (SQL Server es la fuente transaccional); el log falla de forma controlada
y se informa en consola. Los endpoints que dependen solo de MongoDB responden `503`, y `/salud` lo indica.

**¿Por qué OpenAPI si ya hay README y Postman?**
Porque es el estándar de la industria para describir APIs REST: es un contrato legible por máquinas.
De él se genera documentación interactiva (Swagger UI), colecciones de Postman y hasta clientes para el
front-end, y sirve como acuerdo entre el equipo de backend y el de frontend.

**¿Qué es Richardson Nivel 2?**
Recursos identificados por URI (nivel 1) + uso correcto de verbos HTTP y códigos de estado (nivel 2):
`GET` no modifica, `POST` crea (201), `PUT` reemplaza (200), `DELETE` elimina (204), y los errores usan
400/404/405/409.

## 3. Metacognición (reflexión post-evaluación)

> Respuestas de referencia: adáptalas con tu propia experiencia.

**¿Cuál fue el mayor reto técnico al integrar dos tipos de bases de datos diferentes?**
Mantener la consistencia entre ellas sin transacciones distribuidas. Se resolvió definiendo
responsabilidades claras: SQL Server es la fuente de verdad transaccional y MongoDB guarda información
complementaria. Por eso los logs se escriben después de confirmar la operación SQL y nunca la revierten,
y antes de guardar un comentario se verifica en SQL que la sala y el usuario existan. También fue un reto
traducir los errores de SQL Server (`THROW 50004`, violaciones de FK o UNIQUE) a códigos HTTP correctos.

**¿Cómo te ayudó el uso de Middlewares a mantener el código más limpio?**
Cada preocupación transversal vive en un solo lugar: el logging registra todas las peticiones sin tocar
las rutas, la validación rechaza datos inválidos antes de llegar a la base y el manejador global de
errores da a todas las respuestas de error la misma forma. Los controladores quedaron cortos y enfocados
solo en la lógica del recurso, sin `try/catch` repetidos.

**¿Qué parte del flujo de una petición HTTP te resulta más clara ahora?**
El recorrido completo: la petición entra al middleware de logging (que le asigna un `X-Request-Id`),
pasa por seguridad y `express.json`, el router la dirige al recurso, la validación la acepta o la rechaza
con 400, el controlador llama al repositorio, este consulta SQL Server o MongoDB, y la respuesta (o el
error que captura el manejador global) vuelve al cliente con el código de estado adecuado. Al terminar,
el evento queda registrado en MongoDB y se puede rastrear con el mismo `idPeticion`.
