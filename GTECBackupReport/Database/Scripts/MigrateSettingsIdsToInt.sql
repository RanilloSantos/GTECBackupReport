/*
  Converts existing GUID settings IDs to compact integer IDs while preserving
  configured marker colors and source mappings. Run once against GTECBackupMonitor.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF TYPE_NAME((SELECT system_type_id FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.BackupMarkerColors') AND name = N'ColorId')) = N'uniqueidentifier'
BEGIN
    BEGIN TRY
        BEGIN TRANSACTION;

        CREATE TABLE #ColorIdMap (OldId uniqueidentifier NOT NULL PRIMARY KEY, NewId int NOT NULL UNIQUE);
        INSERT #ColorIdMap (OldId, NewId)
        SELECT ColorId, ROW_NUMBER() OVER (ORDER BY ColorId)
        FROM dbo.BackupMarkerColors;

        CREATE TABLE #SourceIdMap (OldId uniqueidentifier NOT NULL PRIMARY KEY, NewId int NOT NULL UNIQUE);
        INSERT #SourceIdMap (OldId, NewId)
        SELECT SourceId, ROW_NUMBER() OVER (ORDER BY SourceId)
        FROM dbo.BackupSources;

        CREATE TABLE dbo.BackupMarkerColors_Int
        (
            ColorId int NOT NULL CONSTRAINT PK_BackupMarkerColors_Int PRIMARY KEY,
            Name nvarchar(32) NOT NULL,
            HexValue char(7) NOT NULL,
            CONSTRAINT CK_BackupMarkerColors_Int_HexValue CHECK (HexValue LIKE '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]')
        );
        INSERT dbo.BackupMarkerColors_Int (ColorId, Name, HexValue)
        SELECT map.NewId, colors.Name, colors.HexValue
        FROM dbo.BackupMarkerColors AS colors
        INNER JOIN #ColorIdMap AS map ON map.OldId = colors.ColorId;

        CREATE TABLE dbo.BackupSources_Int
        (
            SourceId int NOT NULL CONSTRAINT PK_BackupSources_Int PRIMARY KEY,
            Name nvarchar(80) NOT NULL,
            FilenamePatterns nvarchar(300) NOT NULL,
            FolderScope nvarchar(300) NOT NULL CONSTRAINT DF_BackupSources_Int_FolderScope DEFAULT N'',
            ColorId int NOT NULL,
            ExpectedSchedule nvarchar(20) NOT NULL,
            IsActive bit NOT NULL,
            CONSTRAINT FK_BackupSources_Int_BackupMarkerColors_Int FOREIGN KEY (ColorId) REFERENCES dbo.BackupMarkerColors_Int (ColorId),
            CONSTRAINT CK_BackupSources_Int_ExpectedSchedule CHECK (ExpectedSchedule IN (N'Daily', N'Weekdays', N'Weekly'))
        );
        INSERT dbo.BackupSources_Int (SourceId, Name, FilenamePatterns, FolderScope, ColorId, ExpectedSchedule, IsActive)
        SELECT sourceMap.NewId, sources.Name, sources.FilenamePatterns, sources.FolderScope, colorMap.NewId, sources.ExpectedSchedule, sources.IsActive
        FROM dbo.BackupSources AS sources
        INNER JOIN #SourceIdMap AS sourceMap ON sourceMap.OldId = sources.SourceId
        INNER JOIN #ColorIdMap AS colorMap ON colorMap.OldId = sources.ColorId;

        DROP TABLE dbo.BackupSources;
        DROP TABLE dbo.BackupMarkerColors;
        EXEC sys.sp_rename N'dbo.BackupMarkerColors_Int', N'BackupMarkerColors';
        EXEC sys.sp_rename N'dbo.BackupSources_Int', N'BackupSources';
        CREATE UNIQUE INDEX UX_BackupSources_Name ON dbo.BackupSources (Name);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO
