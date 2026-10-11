/*
  Renames the existing settings tables and removes the legacy procedure names.
  Run against GTECBackupMonitor, then run BackupSettings.sql to create pr_* procedures.
*/
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.BackupSettings_Get', N'P') IS NOT NULL
    DROP PROCEDURE dbo.BackupSettings_Get;
IF OBJECT_ID(N'dbo.BackupSettings_Replace', N'P') IS NOT NULL
    DROP PROCEDURE dbo.BackupSettings_Replace;

IF OBJECT_ID(N'dbo.BackupMonitorSettings', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.MonitorSettings', N'U') IS NULL
    EXEC sys.sp_rename N'dbo.BackupMonitorSettings', N'MonitorSettings';
IF OBJECT_ID(N'dbo.BackupMarkerColors', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.MarkerColors', N'U') IS NULL
    EXEC sys.sp_rename N'dbo.BackupMarkerColors', N'MarkerColors';
IF OBJECT_ID(N'dbo.BackupSources', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.Sources', N'U') IS NULL
    EXEC sys.sp_rename N'dbo.BackupSources', N'Sources';
IF OBJECT_ID(N'dbo.BackupFileFormats', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.FileFormats', N'U') IS NULL
    EXEC sys.sp_rename N'dbo.BackupFileFormats', N'FileFormats';
IF OBJECT_ID(N'dbo.BackupStatuses', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.Statuses', N'U') IS NULL
    EXEC sys.sp_rename N'dbo.BackupStatuses', N'Statuses';

IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Sources') AND name = N'UX_BackupSources_Name')
    EXEC sys.sp_rename N'dbo.Sources.UX_BackupSources_Name', N'UX_Sources_Name', N'INDEX';
GO
