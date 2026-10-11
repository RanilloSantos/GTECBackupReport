/*
  Restores the original sample mappings for local testing. This script is
  idempotent and leaves other configured mappings untouched.
  Run in GTECBackupMonitor after BackupSettings.sql.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF NOT EXISTS (SELECT 1 FROM dbo.MarkerColors WHERE Name = N'GTEC Green')
    BEGIN
        UPDATE color
        SET Name = N'GTEC Green', HexValue = '#43a077'
        FROM dbo.MarkerColors AS color
        INNER JOIN dbo.Sources AS source ON source.ColorId = color.ColorId
        WHERE source.Name = N'GTEC'
          AND NOT EXISTS (SELECT 1 FROM dbo.MarkerColors WHERE Name = N'GTEC Green');
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.MarkerColors WHERE Name = N'GTEC OneSys Blue')
        INSERT dbo.MarkerColors (ColorId, Name, HexValue)
        SELECT COALESCE(MAX(ColorId), 0) + 1, N'GTEC OneSys Blue', '#3287bd' FROM dbo.MarkerColors;

    IF NOT EXISTS (SELECT 1 FROM dbo.MarkerColors WHERE Name = N'GTEC MongoDB Purple')
        INSERT dbo.MarkerColors (ColorId, Name, HexValue)
        SELECT COALESCE(MAX(ColorId), 0) + 1, N'GTEC MongoDB Purple', '#8870b1' FROM dbo.MarkerColors;

    IF NOT EXISTS (SELECT 1 FROM dbo.MarkerColors WHERE Name = N'GTEC Green')
        INSERT dbo.MarkerColors (ColorId, Name, HexValue)
        SELECT COALESCE(MAX(ColorId), 0) + 1, N'GTEC Green', '#43a077' FROM dbo.MarkerColors;

    UPDATE dbo.MarkerColors SET HexValue = '#3287bd' WHERE Name = N'GTEC OneSys Blue';
    UPDATE dbo.MarkerColors SET HexValue = '#8870b1' WHERE Name = N'GTEC MongoDB Purple';
    UPDATE dbo.MarkerColors SET HexValue = '#43a077' WHERE Name = N'GTEC Green';

    DECLARE @BlueId int = (SELECT MIN(ColorId) FROM dbo.MarkerColors WHERE Name = N'GTEC OneSys Blue');
    DECLARE @PurpleId int = (SELECT MIN(ColorId) FROM dbo.MarkerColors WHERE Name = N'GTEC MongoDB Purple');
    DECLARE @GreenId int = (SELECT MIN(ColorId) FROM dbo.MarkerColors WHERE Name = N'GTEC Green');

    IF EXISTS (SELECT 1 FROM dbo.Sources WHERE Name = N'GTEC OneSys')
        UPDATE dbo.Sources SET FilenamePatterns = N'GTECOnesys*', FolderScope = N'', ColorId = @BlueId, ExpectedSchedule = N'Daily', IsActive = 1 WHERE Name = N'GTEC OneSys';
    ELSE
        INSERT dbo.Sources (SourceId, Name, FilenamePatterns, FolderScope, ColorId, ExpectedSchedule, IsActive)
        SELECT COALESCE(MAX(SourceId), 0) + 1, N'GTEC OneSys', N'GTECOnesys*', N'', @BlueId, N'Daily', 1 FROM dbo.Sources;

    IF EXISTS (SELECT 1 FROM dbo.Sources WHERE Name = N'GTEC MongoDB')
        UPDATE dbo.Sources SET FilenamePatterns = N'GTEC_PROD_database*', FolderScope = N'', ColorId = @PurpleId, ExpectedSchedule = N'Daily', IsActive = 1 WHERE Name = N'GTEC MongoDB';
    ELSE
        INSERT dbo.Sources (SourceId, Name, FilenamePatterns, FolderScope, ColorId, ExpectedSchedule, IsActive)
        SELECT COALESCE(MAX(SourceId), 0) + 1, N'GTEC MongoDB', N'GTEC_PROD_database*', N'', @PurpleId, N'Daily', 1 FROM dbo.Sources;

    IF EXISTS (SELECT 1 FROM dbo.Sources WHERE Name = N'GTEC')
        UPDATE dbo.Sources SET FilenamePatterns = N'GTEC_backup*', FolderScope = N'', ColorId = @GreenId, ExpectedSchedule = N'Daily', IsActive = 1 WHERE Name = N'GTEC';
    ELSE
        INSERT dbo.Sources (SourceId, Name, FilenamePatterns, FolderScope, ColorId, ExpectedSchedule, IsActive)
        SELECT COALESCE(MAX(SourceId), 0) + 1, N'GTEC', N'GTEC_backup*', N'', @GreenId, N'Daily', 1 FROM dbo.Sources;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
