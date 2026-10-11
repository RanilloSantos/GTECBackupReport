# GTEC Backup Monitor - Plan

## Purpose

Show which backup files are present in a configured directory and which expected backups are missing. Finding a file confirms its presence, not that its contents are valid.

## Implemented

- ASP.NET Core MVC dashboard with Identity sign-in and registration in modals.
- ASP.NET Core Identity accounts, roles, claims, and tokens persisted in SQL Server through EF Core (`ApplicationDbContext`). `Database/Scripts/IdentitySchema.sql` provisions the current Identity schema.
- Authenticated recursive directory scan of files and subfolders. The scan reads metadata only, skips inaccessible/reparse-point paths, and returns up to 10,000 files.
- Settings modal for target directory, database mappings, file formats, and marker colors. Shared settings are stored in SQL Server through Service, Business abstractions, Dapper repositories, and stored procedures.
- Backup source, status, and file format filter options load from SQL Server; filters open with blank selections. New databases seed the standard statuses and active `.bak` format, while source mappings, marker colors, and target directory start empty.
- Settings source and marker color IDs use compact integers. Existing databases can migrate them with `Database/Scripts/MigrateSettingsIdsToInt.sql`.
- Settings use `MonitorSettings`, `MarkerColors`, `Sources`, `FileFormats`, and `Statuses` tables with `pr_Settings_Get` / `pr_Settings_Replace` procedures.
- Mapping by filename wildcard patterns (`*`), optional subfolder scope, and Daily / Weekdays / Weekly schedules.
- Weekly view for the last seven days through today; monthly view from the first of this month through today; custom dates initially cover January 1 through today.
- Expected rows for mapped databases, with Working, No Backup, and Unmapped states.
- Filters for database, all files, unmapped, status, and file format; multiple filename/path search terms; sorting; pagination; details; and printing.
- CMD script that creates 37 sample files: `create-sample-backups.cmd`.

## Current report columns

Day, Date, Database / Backup Source, File Name / Format, Status, and Details. Backup and detected timestamps appear in the Details dialog rather than as table columns.

## Current limits

- Legacy browser-local settings are removed when each browser loads the updated page. Search terms and filter selections remain page-only state.
- The selected path must be an absolute directory readable by the web server process. The authenticated scan request accepts a path from the browser; production use needs server-side path restrictions and role checks.
- Expected No Backup rows can currently be generated before a scan succeeds, including when no directory is configured. Fix this before relying on missing-backup results.
- Backup dates are currently based on file modified dates. Filename-specific date parsing is not implemented.
- Scanning happens when the dashboard loads or the directory setting changes. There is no scheduled/background scan or persistent backup history.
- Role-based administration, file downloads, exports, audit history, deletion/restore, and retention jobs are not implemented.
- Settings persistence is connected through Business and DataAccess. The active file scan and report history are not yet database-backed; Dapper stored procedures remain the required persistence approach.

## Next work

1. Fix scan-state handling so No Backup is shown only after a successful scan; restrict monitoring paths and settings administration on the server.
2. Agree on backup date rules and expected schedules; record daily found/missing results persistently.
3. Implement application/business logic and Dapper repositories for persisted scan results and backup history.
4. Add role-based administration and audited, authorized download/export features if needed.
5. Add background scanning, operational logging, and deployment configuration.

## References

- [Project wiki](wiki/Home.md) - how the current app works.
- [Architecture](PROJECT_ARCHITECTURE.txt) - project boundaries and request flow.
- [SampleCode.txt](SampleCode.txt) - Dapper/stored-procedure coding reference.
- [Parent product plan](../Plan.md) - broader product goals.

## SQL Server authentication setup

Identity is configured through `UseSqlServer` and `AddEntityFrameworkStores<ApplicationDbContext>()`. The checked-in default connection string targets `GTECBackupMonitor` on LocalDB for development. Its Identity schema is provisioned and the existing users have been copied from the previous LocalDB database; the source database remains intact. For another SQL Server, override `ConnectionStrings:DefaultConnection` using deployment configuration (for example, the `ConnectionStrings__DefaultConnection` environment variable); do not commit credentials. For future databases, run `Database/Scripts/IdentitySchema.sql` to create the schema and, when migrating existing accounts on the same SQL Server instance, `Database/Scripts/MigrateIdentityData.sql` to copy Identity data. Keep future schema changes in EF migrations and regenerate the deployment script from those migrations.
