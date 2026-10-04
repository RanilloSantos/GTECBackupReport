# Backup File Monitoring Website — Project Plan

## Purpose

Replace the manual weekly backup check with an internal website that monitors a configured directory tree and reports whether expected database backups were found. The directory scan discovers all files and formats by default; configurable database mappings identify which files belong to which source and date.

A detected file is evidence of presence only. It does not prove that the backup contents are valid. A scanner error must never be reported as a missing backup.

## Dashboard

The main dashboard provides weekly, monthly, and custom date views, with Monday–Sunday weeks and calendar months. Users can filter by database mapping, status, file format, and a set of filename/path search terms.

Search terms are added one at a time: enter a term such as `GTECOnesys`, press the check/add control, then add `GTEC_backup`. A row matches any one of the confirmed terms; period, database, status, and format filters apply in addition. Terms appear as removable chips.

The report table contains:

1. Day — weekday of the expected backup date.
2. Date — expected backup date.
3. Database / Backup Source — matched mapping, or Unmapped.
4. File Name / Format — matched file and extension.
5. Status — Working, No Backup, Scanner Error, or Unmapped as applicable.
6. Actions — read-only details initially; no file download in the current scope.

Backup and detected timestamps are omitted from the table and may be shown in record details. Sortable headers show an up or down arrow. The dashboard also provides counts, result count, pagination, an empty state, clear-filters, and print of the current filtered report.

## Directory coverage and mapping settings

Scan the configured root directory recursively. Include every file type by default; allow format include/exclude rules without silently hiding unknown extensions or extensionless files.

A settings control opens database/file mappings. Users with configuration permission can search mappings and add, edit, activate, or deactivate them. Each mapping should support:

- Display/database name.
- One or more filename patterns or prefixes that identify its files.
- Optional subfolder scope.
- Marker color shown beside matched filenames.
- Expected schedule (daily, weekly, or selected weekdays).
- Active/inactive state.

Examples include mapping `GTECOnesys*` to GTEC OneSys (blue) and `GTEC_backup*` to GTEC (green). The color marker appears beside the Database / Backup Source label. It is a visual cue; the database column remains so daily expected results can be understood. If more than one active mapping matches a file, flag it for mapping review instead of choosing arbitrarily. Files not matched by a mapping remain visible as Unmapped.

## Daily expected records and status rules

For each active database mapping and each date on which a backup is expected, the report must represent an expected record even when no matching file exists. This allows the team to see No Backup days rather than only files that were found.

- Working: scanner completed for the relevant folder and found a matching file for that expected source/date.
- No Backup: scanner completed successfully, the configured schedule says a backup was due, and no matching file was found after the allowed run window.
- Scanner Error: the scanner could not complete or access the relevant folder; do not infer No Backup.
- Unmapped: a discovered file did not match an active database mapping or matched ambiguously.

Expected schedules and any grace period must be configurable; do not assume all sources run every day or use the same filename format.

## Printing and reports

Print the currently filtered report with its date period, active search chips, generation time, and result count. Hide navigation, filter controls, and actions in print layout. Weekly and monthly print views are in scope. PDF/Excel exports may be added after the print output and source data are agreed. Yearly reports are deferred; backups are cleaned every two months.

## Solution architecture

The solution separates `GTECBackupReport` (MVC presentation), `Service` (use cases and request/response DTOs), `Business` (rules, abstractions, and models), and `DataAccess` (Dapper repositories).

- Business models live under `Business/Models`.
- HTTP/application request and response DTOs live under `Service/Contracts/Requests` and `Service/Contracts/Responses`.
- Controllers call Service and do not contain business rules or database code.
- DataAccess uses Dapper with SQL Server stored procedures only; do not embed query text in application C#.
- Browser scripts/AJAX live under `GTECBackupReport/wwwroot/scripts`.
- Use SweetAlert2 for notifications and confirmations. Protect state-changing POSTs with anti-forgery validation; server-side validation and authorization remain authoritative.

See `GTECBackupReport/PROJECT_ARCHITECTURE.txt` for detailed boundaries and request flow.

## Security and future work

Use Microsoft Authentication and role checks for mapping administration, corrections, deletion, restoration, and report access according to company policy. The scanning identity should have only the read permissions it needs on configured backup folders. Backup file downloads are future work and must be restricted to authorized users and audited before implementation.

Later phases may add scheduled scanning, filename/date parsing, scanner logs, audit history, soft delete/restore, retention cleanup, notifications, and IIS deployment. Confirm root paths, source patterns, schedules, time zone, grace periods, and permissions before connecting a production scanner.

