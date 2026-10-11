/*
  Stores each Identity user's preferred initial dashboard filters.
  Run once in GTECBackupMonitor after the Identity schema exists.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.UserFilterDefaults', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserFilterDefaults
    (
        UserId nvarchar(450) NOT NULL CONSTRAINT PK_UserFilterDefaults PRIMARY KEY,
        Period nvarchar(10) NOT NULL CONSTRAINT DF_UserFilterDefaults_Period DEFAULT N'week',
        Source nvarchar(80) NOT NULL CONSTRAINT DF_UserFilterDefaults_Source DEFAULT N'all-databases',
        Status nvarchar(32) NOT NULL CONSTRAINT DF_UserFilterDefaults_Status DEFAULT N'',
        Format nvarchar(32) NOT NULL CONSTRAINT DF_UserFilterDefaults_Format DEFAULT N'',
        CONSTRAINT FK_UserFilterDefaults_AspNetUsers FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE CASCADE
    );
END;
GO

IF COL_LENGTH(N'dbo.UserFilterDefaults', N'Period') IS NULL
    ALTER TABLE dbo.UserFilterDefaults ADD Period nvarchar(10) NOT NULL CONSTRAINT DF_UserFilterDefaults_Period DEFAULT N'week';
GO

CREATE OR ALTER PROCEDURE dbo.pr_UserFilterDefaults_Get
    @UserId nvarchar(450)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COALESCE(preferences.Period, N'week') AS Period,
           COALESCE(preferences.Source, N'all-databases') AS Source,
           COALESCE(preferences.Status, N'') AS Status,
           COALESCE(preferences.Format, N'') AS Format
    FROM (VALUES (1)) AS rowSeed (Id)
    LEFT JOIN dbo.UserFilterDefaults AS preferences ON preferences.UserId = @UserId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.pr_UserFilterDefaults_Replace
    @UserId nvarchar(450),
    @Period nvarchar(10),
    @Source nvarchar(80),
    @Status nvarchar(32),
    @Format nvarchar(32)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @UserId IS NULL OR LEN(@UserId) = 0 OR @Period IS NULL OR @Period NOT IN (N'week', N'month', N'custom') OR @Source IS NULL OR @Status IS NULL OR @Format IS NULL
        THROW 51110, 'User filter defaults are incomplete.', 1;

    BEGIN TRANSACTION;
    UPDATE dbo.UserFilterDefaults WITH (UPDLOCK, SERIALIZABLE)
    SET Period = @Period, Source = @Source, Status = @Status, Format = @Format
    WHERE UserId = @UserId;

    IF @@ROWCOUNT = 0
        INSERT dbo.UserFilterDefaults (UserId, Period, Source, Status, Format)
        VALUES (@UserId, @Period, @Source, @Status, @Format);

    COMMIT TRANSACTION;
END;
GO
