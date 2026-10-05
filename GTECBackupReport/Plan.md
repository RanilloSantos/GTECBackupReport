# GTEC Backup Monitor - Plan

## Purpose

Show which backup files are present in a configured directory and which expected backups are missing. Finding a file confirms its presence, not that its contents are valid.

## Implemented

- ASP.NET Core MVC dashboard with Identity sign-in and registration in modals.
- Authenticated recursive directory scan of files and subfolders. The scan reads metadata only, skips inaccessible/reparse-point paths, and returns up to 10,000 files.
- Settings modal for target directory, database mappings, file formats, and marker colors. Settings are saved in the current browser.
- Mapping by filename wildcard patterns (`*`), optional subfolder scope, and Daily / Weekdays / Weekly schedules.
- Weekly view for the last seven days through today; monthly view from the first of this month through today; custom dates initially cover January 1 through today.
- Expected rows for mapped databases, with Working, No Backup, and Unmapped states.
- Filters for database, all files, unmapped, status, and file format; multiple filename/path search terms; sorting; pagination; details; and printing.
- CMD script that creates 37 sample files: `create-sample-backups.cmd`.

## Current report columns

Day, Date, Database / Backup Source, File Name / Format, Status, and Details. Backup and detected timestamps appear in the Details dialog rather than as table columns.

## Current limits

- Settings live in browser local storage; they are not shared between users or browsers.
- The selected path must be an absolute directory readable by the web server process. The authenticated scan request accepts a path from the browser; production use needs server-side path restrictions and role checks.
- Expected No Backup rows can currently be generated before a scan succeeds, including when no directory is configured. Fix this before relying on missing-backup results.
- Backup dates are currently based on file modified dates. Filename-specific date parsing is not implemented.
- Scanning happens when the dashboard loads or the directory setting changes. There is no scheduled/background scan or persistent backup history.
- Identity sign-in is present. Role-based administration, file downloads, exports, audit history, deletion/restore, and retention jobs are not implemented.
- Business and DataAccess are not yet connected to the active scan feature. Dapper stored-procedure access remains the planned database approach.

## Next work

1. Fix scan-state handling so No Backup is shown only after a successful scan; then store and restrict monitoring settings on the server.
2. Agree on backup date rules and expected schedules; record daily found/missing results persistently.
3. Implement application/business logic and Dapper repositories that call stored procedures.
4. Add role-based administration and audited, authorized download/export features if needed.
5. Add background scanning, operational logging, and deployment configuration.

## References

- [Project wiki](wiki/Home.md) - how the current app works.
- [Architecture](PROJECT_ARCHITECTURE.txt) - project boundaries and request flow.
- [SampleCode.txt](SampleCode.txt) - Dapper/stored-procedure coding reference.
- [Parent product plan](../Plan.md) - broader product goals.