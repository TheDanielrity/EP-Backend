/* =============================================================================
   MYTHOS COWORKING - Sistema de Gestión de Reservas - Script de SQL Server
   -----------------------------------------------------------------------------
   Crea la base MythosReservasDB con un esquema normalizado (3FN):
     - dbo.Usuarios  : personas que reservan.
     - dbo.Salas     : salas de reuniones disponibles.
     - dbo.Reservas  : tabla asociativa Usuario-Sala con un intervalo de tiempo.
   Incluye restricciones con nombre (PK, FK, UNIQUE, CHECK), índices, una vista
   y los procedimientos almacenados transaccionales dbo.RegistrarReserva y
   dbo.ActualizarReserva.

   Ejecutar completo en SSMS / Azure Data Studio, o con:
     sqlcmd -S localhost -U sa -P <clave> -C -i database/sqlserver.sql

   ATENCIÓN: el script es re-ejecutable; elimina y vuelve a crear los objetos,
   por lo que borra los datos existentes.
   ============================================================================= */

IF DB_ID(N'MythosReservasDB') IS NULL
    CREATE DATABASE MythosReservasDB;
GO

USE MythosReservasDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ---------- Limpieza (orden inverso a las dependencias) ---------- */
DROP PROCEDURE IF EXISTS dbo.ActualizarReserva;
DROP PROCEDURE IF EXISTS dbo.RegistrarReserva;
DROP VIEW      IF EXISTS dbo.vw_ReservasDetalle;
DROP TABLE     IF EXISTS dbo.Reservas;
DROP TABLE     IF EXISTS dbo.Salas;
DROP TABLE     IF EXISTS dbo.Usuarios;
GO

/* ---------- Tablas ---------- */

CREATE TABLE dbo.Usuarios (
    codigo        UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Usuarios_codigo        DEFAULT NEWSEQUENTIALID(),
    nombres       NVARCHAR(100)    NOT NULL,
    correo        NVARCHAR(150)    NOT NULL,
    fechaCreacion DATETIME2(0)     NOT NULL CONSTRAINT DF_Usuarios_fechaCreacion DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Usuarios         PRIMARY KEY CLUSTERED (codigo),
    CONSTRAINT UQ_Usuarios_correo  UNIQUE (correo),
    CONSTRAINT CK_Usuarios_nombres CHECK (LEN(LTRIM(RTRIM(nombres))) > 0),
    CONSTRAINT CK_Usuarios_correo  CHECK (correo LIKE N'%_@_%._%')
);
GO

CREATE TABLE dbo.Salas (
    codigo        UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Salas_codigo        DEFAULT NEWSEQUENTIALID(),
    nombre        NVARCHAR(100)    NOT NULL,
    capacidad     INT              NOT NULL,
    fechaCreacion DATETIME2(0)     NOT NULL CONSTRAINT DF_Salas_fechaCreacion DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Salas           PRIMARY KEY CLUSTERED (codigo),
    CONSTRAINT UQ_Salas_nombre    UNIQUE (nombre),
    CONSTRAINT CK_Salas_nombre    CHECK (LEN(LTRIM(RTRIM(nombre))) > 0),
    CONSTRAINT CK_Salas_capacidad CHECK (capacidad BETWEEN 1 AND 500)
);
GO

CREATE TABLE dbo.Reservas (
    codigo        UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Reservas_codigo        DEFAULT NEWSEQUENTIALID(),
    codigoSala    UNIQUEIDENTIFIER NOT NULL,
    codigoUsuario UNIQUEIDENTIFIER NOT NULL,
    fechaInicio   DATETIME2(0)     NOT NULL,
    fechaFin      DATETIME2(0)     NOT NULL,
    fechaCreacion DATETIME2(0)     NOT NULL CONSTRAINT DF_Reservas_fechaCreacion DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Reservas         PRIMARY KEY CLUSTERED (codigo),
    -- Integridad referencial: no se puede eliminar una sala o usuario con reservas (NO ACTION).
    CONSTRAINT FK_Reservas_Salas    FOREIGN KEY (codigoSala)    REFERENCES dbo.Salas (codigo)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT FK_Reservas_Usuarios FOREIGN KEY (codigoUsuario) REFERENCES dbo.Usuarios (codigo)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT CK_Reservas_fechas   CHECK (fechaFin > fechaInicio)
);
GO

/* ---------- Índices ---------- */
-- Acelera la búsqueda de solapamientos (sala + rango de fechas) y los JOIN por FK.
CREATE NONCLUSTERED INDEX IX_Reservas_Sala_Fechas
    ON dbo.Reservas (codigoSala, fechaInicio) INCLUDE (fechaFin);
CREATE NONCLUSTERED INDEX IX_Reservas_Usuario
    ON dbo.Reservas (codigoUsuario, fechaInicio);
GO

/* ---------- Vista ---------- */
-- Une Reservas con Salas y Usuarios para las lecturas de la API,
-- sin duplicar nombres en la tabla Reservas (se respeta la 3FN).
CREATE VIEW dbo.vw_ReservasDetalle
AS
SELECT r.codigo,
       r.codigoSala,
       s.nombre  AS nombreSala,
       r.codigoUsuario,
       u.nombres AS nombresUsuario,
       r.fechaInicio,
       r.fechaFin,
       r.fechaCreacion
FROM dbo.Reservas r
INNER JOIN dbo.Salas    s ON s.codigo = r.codigoSala
INNER JOIN dbo.Usuarios u ON u.codigo = r.codigoUsuario;
GO

/* ---------- Procedimientos almacenados ----------
   Códigos de error de negocio (THROW) que la API traduce a HTTP:
     50001 -> 400  Fechas inválidas
     50002 -> 404  La sala no existe
     50003 -> 404  El usuario no existe
     50004 -> 409  La sala ya está reservada en ese horario
     50005 -> 404  La reserva no existe
   ------------------------------------------------------------------------- */

CREATE OR ALTER PROCEDURE dbo.RegistrarReserva
    @codigoSala    UNIQUEIDENTIFIER,
    @codigoUsuario UNIQUEIDENTIFIER,
    @fechaInicio   DATETIME2(0),
    @fechaFin      DATETIME2(0)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;   -- cualquier error revierte la transacción completa

    BEGIN TRY
        BEGIN TRANSACTION;

        IF @fechaInicio IS NULL OR @fechaFin IS NULL OR @fechaFin <= @fechaInicio
            THROW 50001, N'Las fechas de la reserva no son válidas', 1;

        -- UPDLOCK + HOLDLOCK bloquea la sala hasta el COMMIT: dos peticiones
        -- simultáneas no pueden reservar el mismo horario (evita condición de carrera).
        IF NOT EXISTS (SELECT 1 FROM dbo.Salas WITH (UPDLOCK, HOLDLOCK) WHERE codigo = @codigoSala)
            THROW 50002, N'La sala no existe', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE codigo = @codigoUsuario)
            THROW 50003, N'El usuario no existe', 1;

        -- Dos intervalos se solapan si uno empieza antes de que termine el otro.
        IF EXISTS (SELECT 1 FROM dbo.Reservas
                   WHERE codigoSala = @codigoSala
                     AND fechaInicio < @fechaFin
                     AND fechaFin    > @fechaInicio)
            THROW 50004, N'La sala ya está reservada en ese horario', 1;

        DECLARE @insertada TABLE (codigo UNIQUEIDENTIFIER);

        INSERT INTO dbo.Reservas (codigoSala, codigoUsuario, fechaInicio, fechaFin)
        OUTPUT INSERTED.codigo INTO @insertada
        VALUES (@codigoSala, @codigoUsuario, @fechaInicio, @fechaFin);

        COMMIT TRANSACTION;

        SELECT v.codigo, v.codigoSala, v.nombreSala, v.codigoUsuario, v.nombresUsuario,
               v.fechaInicio, v.fechaFin, v.fechaCreacion
        FROM dbo.vw_ReservasDetalle v
        INNER JOIN @insertada i ON i.codigo = v.codigo;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.ActualizarReserva
    @codigo        UNIQUEIDENTIFIER,
    @codigoSala    UNIQUEIDENTIFIER,
    @codigoUsuario UNIQUEIDENTIFIER,
    @fechaInicio   DATETIME2(0),
    @fechaFin      DATETIME2(0)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM dbo.Reservas WITH (UPDLOCK, HOLDLOCK) WHERE codigo = @codigo)
            THROW 50005, N'La reserva no existe', 1;

        IF @fechaInicio IS NULL OR @fechaFin IS NULL OR @fechaFin <= @fechaInicio
            THROW 50001, N'Las fechas de la reserva no son válidas', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.Salas WITH (UPDLOCK, HOLDLOCK) WHERE codigo = @codigoSala)
            THROW 50002, N'La sala no existe', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE codigo = @codigoUsuario)
            THROW 50003, N'El usuario no existe', 1;

        -- Se excluye la propia reserva al verificar el solapamiento.
        IF EXISTS (SELECT 1 FROM dbo.Reservas
                   WHERE codigoSala = @codigoSala
                     AND codigo     <> @codigo
                     AND fechaInicio < @fechaFin
                     AND fechaFin    > @fechaInicio)
            THROW 50004, N'La sala ya está reservada en ese horario', 1;

        UPDATE dbo.Reservas
        SET codigoSala    = @codigoSala,
            codigoUsuario = @codigoUsuario,
            fechaInicio   = @fechaInicio,
            fechaFin      = @fechaFin
        WHERE codigo = @codigo;

        COMMIT TRANSACTION;

        SELECT codigo, codigoSala, nombreSala, codigoUsuario, nombresUsuario,
               fechaInicio, fechaFin, fechaCreacion
        FROM dbo.vw_ReservasDetalle
        WHERE codigo = @codigo;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

/* ---------- Datos de ejemplo ---------- */
INSERT INTO dbo.Salas (nombre, capacidad) VALUES
    (N'Sala Olimpo',  8),
    (N'Sala Atenea',  12),
    (N'Sala Hermes',  4);

INSERT INTO dbo.Usuarios (nombres, correo) VALUES
    (N'Ana Torres',   N'ana.torres@mythos.pe'),
    (N'Luis Ramírez', N'luis.ramirez@mythos.pe');

-- Reserva de ejemplo registrada mediante el procedimiento almacenado.
DECLARE @sala UNIQUEIDENTIFIER    = (SELECT codigo FROM dbo.Salas    WHERE nombre = N'Sala Olimpo');
DECLARE @usuario UNIQUEIDENTIFIER = (SELECT codigo FROM dbo.Usuarios WHERE correo = N'ana.torres@mythos.pe');
EXEC dbo.RegistrarReserva
    @codigoSala    = @sala,
    @codigoUsuario = @usuario,
    @fechaInicio   = '2026-12-01T14:00:00',
    @fechaFin      = '2026-12-01T15:00:00';
GO

/* ---------- Verificación rápida ---------- */
SELECT * FROM dbo.vw_ReservasDetalle;
GO
