/*
  Adds database-backed settings and lookup values for the dashboard dropdowns.
  Run in GTECBackupMonitor. Source mappings, colors, and the monitored
  directory intentionally start empty. The .bak format and fixed report status
  choices are seeded; the UI starts with no status selected.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.MonitorSettings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MonitorSettings
    (
        SettingsId tinyint NOT NULL CONSTRAINT PK_MonitorSettings PRIMARY KEY,
        TargetDirectory nvarchar(2048) NOT NULL CONSTRAINT DF_MonitorSettings_TargetDirectory DEFAULT N'',
        CONSTRAINT CK_MonitorSettings_SingleRow CHECK (SettingsId = 1)
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.MonitorSettings WHERE SettingsId = 1)
    INSERT dbo.MonitorSettings (SettingsId, TargetDirectory) VALUES (1, N'');

IF OBJECT_ID(N'dbo.MarkerColors', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MarkerColors
    (
        ColorId int NOT NULL CONSTRAINT PK_MarkerColors PRIMARY KEY,
        Name nvarchar(32) NOT NULL,
        HexValue char(7) NOT NULL,
        CONSTRAINT CK_MarkerColors_HexValue CHECK (HexValue LIKE '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]')
    );
END;

IF OBJECT_ID(N'dbo.Sources', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Sources
    (
        SourceId int NOT NULL CONSTRAINT PK_Sources PRIMARY KEY,
        Name nvarchar(80) NOT NULL,
        FilenamePatterns nvarchar(300) NOT NULL,
        FolderScope nvarchar(300) NOT NULL CONSTRAINT DF_Sources_FolderScope DEFAULT N'',
        ColorId int NOT NULL,
        ExpectedSchedule nvarchar(20) NOT NULL,
        IsActive bit NOT NULL,
        CONSTRAINT FK_Sources_MarkerColors FOREIGN KEY (ColorId) REFERENCES dbo.MarkerColors (ColorId),
        CONSTRAINT CK_Sources_ExpectedSchedule CHECK (ExpectedSchedule IN (N'Daily', N'Weekdays', N'Weekly'))
    );
    CREATE UNIQUE INDEX UX_Sources_Name ON dbo.Sources (Name);
END;

IF OBJECT_ID(N'dbo.FileFormats', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.FileFormats
    (
        Extension nvarchar(32) NOT NULL CONSTRAINT PK_FileFormats PRIMARY KEY,
        IsActive bit NOT NULL
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.FileFormats WHERE Extension = N'.bak')
    INSERT dbo.FileFormats (Extension, IsActive) VALUES (N'.bak', 1);

IF OBJECT_ID(N'dbo.Statuses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Statuses
    (
        StatusCode nvarchar(32) NOT NULL CONSTRAINT PK_Statuses PRIMARY KEY,
        DisplayName nvarchar(64) NOT NULL,
        SortOrder tinyint NOT NULL
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Statuses WHERE StatusCode = N'Working')
    INSERT dbo.Statuses (StatusCode, DisplayName, SortOrder) VALUES (N'Working', N'Working', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Statuses WHERE StatusCode = N'No Backup')
    INSERT dbo.Statuses (StatusCode, DisplayName, SortOrder) VALUES (N'No Backup', N'No Backup', 2);
IF NOT EXISTS (SELECT 1 FROM dbo.Statuses WHERE StatusCode = N'Scanner Error')
    INSERT dbo.Statuses (StatusCode, DisplayName, SortOrder) VALUES (N'Scanner Error', N'Scanner Error', 3);
IF NOT EXISTS (SELECT 1 FROM dbo.Statuses WHERE StatusCode = N'Unmapped')
    INSERT dbo.Statuses (StatusCode, DisplayName, SortOrder) VALUES (N'Unmapped', N'Unmapped', 4);
GO

CREATE OR ALTER PROCEDURE dbo.pr_Settings_Get
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COALESCE(TargetDirectory, N'') AS TargetDirectory
    FROM dbo.MonitorSettings
    WHERE SettingsId = 1;

    SELECT s.SourceId AS Id, s.Name, s.FilenamePatterns AS Patterns, s.FolderScope AS Folder,
           s.ColorId, c.HexValue AS ColorValue, s.ExpectedSchedule AS Schedule, s.IsActive AS Active
    FROM dbo.Sources AS s
    INNER JOIN dbo.MarkerColors AS c ON c.ColorId = s.ColorId
    ORDER BY s.Name;

    SELECT ColorId AS Id, Name, HexValue AS Value
    FROM dbo.MarkerColors
    ORDER BY Name;

    SELECT Extension, IsActive AS Active
    FROM dbo.FileFormats
    ORDER BY Extension;

    SELECT StatusCode AS Value, DisplayName AS Label
    FROM dbo.Statuses
    ORDER BY SortOrder, DisplayName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.pr_Settings_Replace
    @TargetDirectory nvarchar(2048),
    @SourcesJson nvarchar(max),
    @FormatsJson nvarchar(max),
    @ColorsJson nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF ISJSON(@SourcesJson) <> 1 OR ISJSON(@FormatsJson) <> 1 OR ISJSON(@ColorsJson) <> 1
        THROW 51100, 'Backup settings payload is not valid JSON.', 1;

    DECLARE @Sources TABLE
    (
        Id int NOT NULL PRIMARY KEY,
        Name nvarchar(80) NOT NULL,
        Patterns nvarchar(300) NOT NULL,
        Folder nvarchar(300) NOT NULL,
        ColorId int NOT NULL,
        Schedule nvarchar(20) NOT NULL,
        Active bit NOT NULL
    );
    DECLARE @Formats TABLE (Extension nvarchar(32) NOT NULL PRIMARY KEY, Active bit NOT NULL);
    DECLARE @Colors TABLE
    (
        Id int NOT NULL PRIMARY KEY,
        Name nvarchar(32) NOT NULL,
        Value char(7) NOT NULL
    );

    INSERT @Sources (Id, Name, Patterns, Folder, ColorId, Schedule, Active)
    SELECT Id, Name, Patterns, COALESCE(Folder, N''), ColorId, Schedule, Active
    FROM OPENJSON(@SourcesJson) WITH
    (
        Id int N'$.id',
        Name nvarchar(80) N'$.name',
        Patterns nvarchar(300) N'$.patterns',
        Folder nvarchar(300) N'$.folder',
        ColorId int N'$.colorId',
        Schedule nvarchar(20) N'$.schedule',
        Active bit N'$.active'
    );

    INSERT @Formats (Extension, Active)
    SELECT Extension, Active
    FROM OPENJSON(@FormatsJson) WITH
    (
        Extension nvarchar(32) N'$.extension',
        Active bit N'$.active'
    );

    INSERT @Colors (Id, Name, Value)
    SELECT Id, Name, Value
    FROM OPENJSON(@ColorsJson) WITH
    (
        Id int N'$.id',
        Name nvarchar(32) N'$.name',
        Value char(7) N'$.value'
    );

    IF EXISTS (SELECT 1 FROM @Sources AS s LEFT JOIN @Colors AS c ON c.Id = s.ColorId WHERE c.Id IS NULL)
        THROW 51101, 'Every backup source must use a configured marker color.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.MonitorSettings
        SET TargetDirectory = COALESCE(@TargetDirectory, N'')
        WHERE SettingsId = 1;

        DELETE FROM dbo.Sources;
        DELETE FROM dbo.FileFormats;
        DELETE FROM dbo.MarkerColors;

        INSERT dbo.MarkerColors (ColorId, Name, HexValue)
        SELECT Id, Name, Value FROM @Colors;

        INSERT dbo.Sources (SourceId, Name, FilenamePatterns, FolderScope, ColorId, ExpectedSchedule, IsActive)
        SELECT Id, Name, Patterns, Folder, ColorId, Schedule, Active FROM @Sources;

        INSERT dbo.FileFormats (Extension, IsActive)
        SELECT Extension, Active FROM @Formats;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO
