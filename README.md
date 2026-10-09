# EP-Backend

API básica de salas, usuarios y reservas con Node.js, Express, SQL Server y MongoDB.
El proyecto Checa tu Caso se conserva como referencia en su carpeta original.

## Ejecutar

1. Iniciar SQL Server y ejecutar `database/sqlserver.sql` una vez desde SQL Server
   Management Studio. Crea `EPBackend`, las tablas y el procedimiento.
   Configurar `SQL_DATABASE=EPBackend` en `.env` para coincidir con el script actual.
2. Habilitar TCP/IP en SQL Server Configuration Manager y configurar el puerto
   (1433 en el ejemplo). Reiniciar SQL Server si cambias su configuración.
   Esta conexión usa autenticación SQL: habilitar modo mixto y utilizar un login
   con acceso a `ReservasDB` (no utiliza autenticación de Windows).
3. Iniciar MongoDB local o utilizar una URI de MongoDB Atlas.
4. Desde la raíz del proyecto, con Node.js 24:

```sh
npm install
```

En PowerShell, copiar la configuración de ejemplo:

```powershell
Copy-Item .env.example .env
```

Editar `.env` con el servidor, puerto, usuario y contraseña SQL reales y la URI
de MongoDB. Después:

```sh
npm run dev
```

También se puede usar `npm start`. El servidor escucha en `http://localhost:3000`.

## Rutas

| Recurso | Métodos | Ruta |
| --- | --- | --- |
| Salas | GET, POST | /v1/api/salas |
| Usuarios | GET, POST | /v1/api/usuarios |
| Reservas | GET, POST | /v1/api/reservas |

GET lista los registros y POST crea uno. Los ejemplos están en `request.http`.
Primero crear una sala y un usuario; usar sus códigos para crear una reserva.

## API REST: Nivel 2 de Richardson

La API organiza las rutas por recursos (`salas`, `usuarios`, `reservas`), utiliza
GET para consultar sin modificar registros y POST para crear. Los códigos HTTP
indican si la operación fue exitosa o hubo un error. Esto cubre los elementos
del Nivel 2 para las operaciones implementadas. No se requiere implementar todos
los verbos HTTP para este alcance de consulta y creación.

Referencia: [Modelo de Richardson, Nivel 2](https://martinfowler.com/articles/richardsonMaturityModel.html).

URL base: `http://localhost:3000/v1/api`. Enviar los cuerpos POST como JSON con
el encabezado `Content-Type: application/json`.

| Método | Endpoint | Operación | Respuesta exitosa |
| --- | --- | --- | --- |
| GET | /salas | Listar salas | 200, arreglo de salas |
| POST | /salas | Crear sala | 201, sala creada |
| GET | /usuarios | Listar usuarios | 200, arreglo de usuarios |
| POST | /usuarios | Crear usuario | 201, usuario creado |
| GET | /reservas | Listar reservas | 200, arreglo de reservas |
| POST | /reservas | Crear reserva | 201, reserva creada |

### Datos de entrada

POST `/salas`:

```json
{ "nombre": "Sala principal", "capacidad": 10 }
```

`nombre`: texto obligatorio, máximo 100 caracteres. `capacidad`: entero positivo
hasta 2147483647.

POST `/usuarios`:

```json
{ "nombres": "Daniel", "correo": "daniel@example.com" }
```

`nombres`: texto obligatorio, máximo 100 caracteres. `correo`: formato válido,
máximo 150 caracteres y no repetido.

POST `/reservas` (reemplazar los UUID por códigos de una sala y un usuario existentes):

```json
{
    "codigoSala": "11111111-1111-4111-8111-111111111111",
    "codigoUsuario": "22222222-2222-4222-8222-222222222222",
    "fechaInicio": "2026-10-15T09:00:00-05:00",
    "fechaFin": "2026-10-15T10:00:00-05:00"
}
```

Los códigos deben ser UUID. Enviar fechas ISO 8601 con zona horaria; el fin debe
ser posterior al inicio. La sala debe estar libre durante ese intervalo.

### Respuestas

Una creación devuelve el registro y su `codigo`, por ejemplo una sala con 201:

```json
{
    "codigo": "11111111-1111-4111-8111-111111111111",
    "nombre": "Sala principal",
    "capacidad": 10
}
```

GET devuelve un arreglo de registros con 200, o `[]` si todavía no hay registros.
Usuarios incluye `codigo`, `nombres` y `correo`. Reservas incluye `codigo`,
`codigoSala`, `codigoUsuario`, `fechaInicio` y `fechaFin` (fechas en UTC).

| Estado | Significado |
| --- | --- |
| 200 OK | Consulta exitosa |
| 201 Created | Registro creado |
| 400 Bad Request | Datos inválidos o JSON mal formado |
| 404 Not Found | Ruta, sala o usuario referenciado inexistente |
| 409 Conflict | Correo duplicado o sala ocupada en ese horario |
| 500 Internal Server Error | Error interno o fallo inesperado de SQL Server |

Los errores devuelven un objeto con `mensaje`, por ejemplo una validación con 400:

```json
{ "mensaje": "Se requiere nombre y capacidad como entero positivo" }
```

## Organización

- `src/index.js`: inicia el servidor.
- `src/app.js`: configura Express, middlewares y routers.
- `src/routes/api/`: un router por recurso.
- `src/middlewares/logging.js`: registra fecha, método, ruta y estado en consola.
- `src/middlewares/validacion.js`: valida los datos antes de crear registros.
- `src/middlewares/manejoErrores.js`: responde errores en formato JSON.
- `src/db/sqlserver.js`: conexión a SQL Server con `mssql`.
- `src/db/mongodb.js`: conexión a MongoDB y función para guardar eventos.
- `database/sqlserver.sql`: tablas y procedimiento almacenado.

Las respuestas usan 201 al crear, 400 para datos inválidos, 404 para rutas o
referencias inexistentes, 409 para correo duplicado o reserva superpuesta y 500 para
errores internos. El JSON mal formado devuelve 400.

## SQL Server: tercera forma normal (3NF)

| Tabla | Datos |
| --- | --- |
| Usuarios | codigo (PK), nombres, correo (único) |
| Salas | codigo (PK), nombre, capacidad |
| Reservas | codigo (PK), codigoSala (FK), codigoUsuario (FK), fechaInicio, fechaFin |

Cada atributo describe su entidad. En Reservas no se repiten nombres, correos ni
capacidades: se utilizan claves foráneas. No hay grupos repetidos ni dependencias
parciales o transitivas entre los atributos no clave.

`POST /v1/api/reservas` ejecuta `dbo.RegistrarReserva`. El procedimiento comprueba
las fechas, la sala, el usuario y la disponibilidad; registra la reserva dentro
de una transacción. Si hay un error, hace ROLLBACK. La sala se bloquea durante
la transacción para coordinar reservas simultáneas. Las fechas se guardan en UTC.
Las consultas reciben parámetros, sin concatenar los datos de entrada.

## MongoDB: logs flexibles

La base `ReservasLogs` y su colección `logs` se crean al insertar el primer evento.
Se usa el driver oficial: los objetos JavaScript se almacenan como BSON, con
`fecha` de tipo Date. No se impone un esquema rígido a `datos`.

```js
// Evento de petición
{ tipo: 'peticion', fecha: new Date(), datos: { metodo: 'POST', ruta: '/v1/api/salas', estado: 201 } }
// Evento de inicio: datos diferentes
{ tipo: 'inicio', fecha: new Date(), datos: { mensaje: 'Servidor iniciado', puerto: 3000 } }
// Evento de error
{ tipo: 'error', fecha: new Date(), datos: { ruta: '/v1/api/reservas', estado: 409, mensaje: 'La sala ya esta reservada en ese horario' } }
```

Consultar desde mongosh o MongoDB Compass:

```js
use ReservasLogs
db.logs.find().sort({ fecha: -1 })
db.logs.find({ tipo: 'error' })
```

El servidor comprueba ambas conexiones al iniciar. Los logs de las peticiones se
guardan después de responder. Si MongoDB falla durante el uso, se informa en
consola; no se revierte una reserva SQL ya confirmada ni se reintenta el log.
Los comentarios y las notificaciones en tiempo real quedan para siguientes pasos.

## Verificación

`npm test` verifica las rutas, los parámetros del procedimiento, el manejo de
errores SQL y los documentos de logs con conexiones simuladas. No sustituye una
prueba con bases reales.

Para comprobar la integración real, usar `request.http`: crear sala y usuario,
copiar sus códigos y registrar una reserva. Repetirla debe devolver 409. Un correo
repetido debe devolver 409. Reiniciar la API y listar comprueba la persistencia;
consultar `ReservasLogs.logs` comprueba los eventos guardados.

Referencias: [driver SQL Server](https://www.npmjs.com/package/mssql) y
[driver MongoDB](https://www.mongodb.com/docs/drivers/node/current/connect/).
