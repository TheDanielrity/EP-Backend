-- Ejecutar una vez en SQL Server Management Studio antes de iniciar la API.
IF DB_ID('EPBackend') IS NULL
    CREATE DATABASE EPBackend;
GO
USE EPBackend;
GO

CREATE TABLE dbo.Usuarios (
    codigo UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    nombres NVARCHAR(100) NOT NULL,
    correo NVARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE dbo.Salas (
    codigo UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    nombre NVARCHAR(100) NOT NULL,
    capacidad INT NOT NULL CHECK (capacidad > 0)
);

CREATE TABLE dbo.Reservas (
    codigo UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    codigoSala UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Salas(codigo),
    codigoUsuario UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Usuarios(codigo),
    fechaInicio DATETIME2 NOT NULL,
    fechaFin DATETIME2 NOT NULL,
    CHECK (fechaFin > fechaInicio)
);
GO

-- 3NF: cada tabla guarda atributos de su entidad.
-- Reservas solo referencia usuarios y salas, sin repetir nombres o correos.
CREATE OR ALTER PROCEDURE dbo.RegistrarReserva
    @codigoSala UNIQUEIDENTIFIER,
    @codigoUsuario UNIQUEIDENTIFIER,
    @fechaInicio DATETIME2,
    @fechaFin DATETIME2
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF @fechaInicio IS NULL OR @fechaFin IS NULL OR @fechaFin <= @fechaInicio
            THROW 50001, 'Las fechas de la reserva no son validas', 1;

        -- Bloquear la sala hasta terminar evita reservas simultaneas superpuestas.
        IF NOT EXISTS (SELECT 1 FROM dbo.Salas WITH (UPDLOCK, HOLDLOCK) WHERE codigo = @codigoSala)
            THROW 50002, 'La sala no existe', 1;
        IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE codigo = @codigoUsuario)
            THROW 50003, 'El usuario no existe', 1;
        IF EXISTS (
            SELECT 1 FROM dbo.Reservas WHERE codigoSala = @codigoSala
            AND fechaInicio < @fechaFin AND fechaFin > @fechaInicio
        )
            THROW 50004, 'La sala ya esta reservada en ese horario', 1;

        DECLARE @codigo UNIQUEIDENTIFIER = NEWID();
        INSERT INTO dbo.Reservas (codigo, codigoSala, codigoUsuario, fechaInicio, fechaFin)
        VALUES (@codigo, @codigoSala, @codigoUsuario, @fechaInicio, @fechaFin);
        COMMIT TRANSACTION;
        SELECT @codigo AS codigo, @codigoSala AS codigoSala,
               @codigoUsuario AS codigoUsuario, @fechaInicio AS fechaInicio, @fechaFin AS fechaFin;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
