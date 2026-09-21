# Database Backup Monitoring Website — Project Plan

## 1\. Project Overview

Build an internal website to replace the current manual weekly database backup verification and reporting process.

### Current process

Every Monday, the backup status is manually checked by:

1. Remoting into the appropriate server/environment.
2. Opening the backup folder(s).
3. Checking each expected database backup.
4. Finding the backup file for each date.
5. Copying the backup filename into an Excel report.
6. Marking the database as **Working** when a backup exists.
7. Marking it as **No Backup** when the expected backup is missing.
8. Creating/exporting the weekly report as PDF.
9. Sending the report to the team.

The task is repetitive and time-consuming even though the actual logic is relatively simple.

### Proposed process

The website should automate the repetitive work:

```text
Backup Folder
     ↓
Automatic Scanner
     ↓
Detect New Backup Files
     ↓
Identify Backup Source + Backup Date
     ↓
Save/Update Database Record
     ↓
Determine Working / No Backup
     ↓
Web Dashboard
     ↓
PDF / Excel / Print Reports
```

The goal is for the team to check the website themselves instead of relying on a manually prepared report every week.

\---

# 2\. Main Goals

The application should:

* Automatically detect newly created backup files.
* Record backup information in SQL Server.
* Determine whether an expected backup exists.
* Mark missing backups clearly.
* Display current and historical backup information.
* Provide filtering, searching, sorting, and pagination.
* Provide weekly and monthly reports.
* Allow reports to be printed or exported to PDF/Excel.
* Track changes made to records.
* Support soft deletion and restoration.
* Provide an update/audit history.
* Automatically clean up old history/deleted records after the configured retention period.
* Use Microsoft Authentication.
* Be deployable to IIS/internal company infrastructure.

\---

# 3\. Proposed Technology Stack

## Backend

* ASP.NET Core Web App
* C#
* SQL Server

## Frontend

* Bootstrap
* jQuery
* jQuery DataTables

DataTables will provide:

* Pagination
* Searching
* Sorting
* Filtering
* Page size controls

## Authentication

* Microsoft Authentication / existing Microsoft authentication setup

## Hosting

Target deployment:

* IIS
* Internal company server

Deployment is subject to senior/team approval and server access.

\---

# 4\. Main Dashboard

The main view should use a table.

The table should show backup records grouped or filterable by backup source/database.

Based on the current weekly report, the report can contain sections such as:

* GTEC OneSys
* GTEC MongoDB
* GTEC
* Additional backup sources can be added later.

Each section should show information similar to the existing Excel/PDF report.

Suggested columns:

|Column|Description|
|-|-|
|Day|Day of the week|
|Date|Expected backup date|
|Database / Backup Source|Database or backup source|
|File Name|Detected backup filename|
|Status|Working / No Backup|
|Backup Date/Time|Date/time associated with the backup|
|Detected Date/Time|When the application detected the file|
|Actions|View/update/delete where permitted|

\---

# 5\. Backup Status

The application should automatically determine the backup status.

## Working

If an expected backup file is found:

```text
Status = Working
```

Example:

```text
Monday | 8/17/2026 | GTEC\_backup\_2026\_08\_17\_210001\_9137841 | Working
```

## No Backup

If an expected backup does not exist:

```text
Status = No Backup
```

Example:

```text
Monday | 8/17/2026 | No database backup record for 8/17/2026 | No Backup
```

The exact status names should be finalized before implementation.

\---

# 6\. Backup Sources

The system should not assume every backup filename follows the same pattern.

The current report contains different filename formats, for example:

### GTEC OneSys

```text
GTECOnesys\_backup\_2026\_08\_17\_210001\_9294131
```

### GTEC MongoDB

```text
GTEC\_PROD\_database\_\_Mon\_\_08-17-2026\_\_20-00-01\_79
```

### GTEC

```text
GTEC\_backup\_2026\_08\_17\_210001\_9137841
```

Because the formats differ, the application should treat each backup source as configurable.

Suggested configuration concept:

```text
Backup Source
    ├── Name
    ├── Backup Folder
    ├── File Pattern
    ├── Expected Frequency
    └── Active/Inactive
```

This allows new backup sources to be added without redesigning the application.

\---

# 7\. Expected Backup Schedule

The application needs to know what backups are expected.

For the current weekly report, each source appears to have one expected backup for each day:

```text
Monday
Tuesday
Wednesday
Thursday
Friday
Saturday
Sunday
```

However, the system should not hard-code this assumption permanently.

Each backup source should have a configurable schedule.

Possible schedules:

* Daily
* Weekly
* Specific days of the week
* Other schedules if required later

This is necessary because a missing file can only be considered a failure if a backup was actually expected.

\---

# 8\. Automatic Folder Detection

The application should automatically detect new backup files.

The preferred architecture is **not** to scan the folder every time a user opens the website.

Instead, use a background/scheduled process.

Possible implementation:

* ASP.NET Core `BackgroundService`
* Scheduled Windows Task
* SQL Server Agent job
* Another approved internal scheduled process

The final choice should depend on the company's IIS/server environment.

## Recommended flow

```text
Scheduled Scanner
      ↓
Scan Backup Folder
      ↓
Find Backup Files
      ↓
Parse Filename / Date
      ↓
Identify Backup Source
      ↓
Check for Existing Record
      ↓
Insert New Record
      ↓
Update Status
```

The scanner should be idempotent.

Running it multiple times must not create duplicate backup records.

\---

# 9\. Backup Database Configuration

The system should maintain an authoritative list of expected backup sources/databases.

Suggested table:

## `BackupSource`

|Field|Purpose|
|-|-|
|BackupSourceID|Primary key|
|Name|Display name|
|DatabaseName|Database/source name|
|BackupFolder|Folder being monitored|
|FilePattern|Pattern used to identify files|
|ExpectedFrequency|Daily/weekly/etc.|
|IsActive|Whether monitoring is enabled|
|DateCreated|Creation date|
|DateUpdated|Last update date|

Additional fields can be added if required.

\---

# 10\. Backup Record

Suggested table:

## `BackupRecord`

|Field|Purpose|
|-|-|
|BackupRecordID|Primary key|
|BackupSourceID|Related backup source|
|BackupDate|Date the backup represents|
|BackupFileName|Detected file name|
|BackupFilePath|Optional path/reference|
|FileModifiedDate|File's modified timestamp|
|FileSize|Optional file size|
|Status|Working / No Backup / etc.|
|DetectedDate|When the application detected it|
|DateCreated|Record creation date|
|DateUpdated|Last update date|
|IsDeleted|Soft-delete flag|
|DeletedDate|When it was deleted|
|DeletedBy|Who deleted it|

The exact schema should be finalized after reviewing the actual backup folders and filename conventions.

\---

# 11\. Missing Backup Records

The system must be able to represent an expected backup even when no file exists.

This is important.

If the system only stores files that were found, it cannot easily distinguish:

```text
No backup exists
```

from:

```text
The system did not check
```

The application should therefore generate or calculate expected backup records/statuses based on the configured schedule.

Example:

```text
Expected:
GTEC
2026-08-26
```

Scanner result:

```text
No matching backup found
```

Displayed result:

```text
2026-08-26 | GTEC | No database backup record for 2026-08-26 | No Backup
```

\---

# 12\. Scanner Failure vs Backup Failure

The application must distinguish between:

### Backup failure

```text
Scanner worked
+
Expected backup was not found
=
No Backup
```

and:

### Scanner failure

```text
Scanner could not access folder
=
Scanner Error
```

These should not be treated as the same thing.

Otherwise, a broken scanner could incorrectly make every database appear to have no backup.

Suggested scanner/system information:

* Last successful scan
* Last scan date/time
* Number of files scanned
* Number of new records
* Number of errors
* Last error message

\---

# 13\. Duplicate Prevention

The scanner may encounter the same file multiple times.

The application must prevent duplicate records.

Possible uniqueness rule:

```text
BackupSourceID + BackupDate + BackupFileName
```

The final unique key should be determined after reviewing the real backup naming convention.

The database should enforce uniqueness in addition to application-level checks.

\---

# 14\. Main Table / DataTables

The main page should use jQuery DataTables.

Required features:

* Pagination
* Search
* Sort
* Filter
* Date range
* Backup source/database filter
* Status filter
* File name search

The initial preferred view is approximately one week's worth of records per page.

However, the page size should be configurable because a backup source may eventually have multiple records per day.

\---

# 15\. CRUD

The application can support CRUD, but backup records should primarily be system-generated.

## Create

Primary creation should happen automatically when a new backup file is detected.

Manual creation may be allowed for configuration records or authorized corrections.

## Read

Users can:

* View current backups
* View historical backups
* Search
* Filter
* Sort
* View details
* View audit history

## Update

Authorized users can correct records when necessary.

Every update must be recorded in the audit history.

## Delete

Use soft deletion instead of immediately physically deleting records.

\---

# 16\. Audit / Update History

A separate table should track changes.

Suggested table:

## `BackupRecordHistory`

|Field|Purpose|
|-|-|
|BackupRecordHistoryID|Primary key|
|BackupRecordID|Related record|
|ChangedBy|User who made the change|
|ChangedDate|Date/time of change|
|ChangeType|Update/Delete/Restore/etc.|
|ChangesJson|JSON describing the changes|

The `ChangesJson` column can contain the previous and new values.

Example:

```json
{
  "Status": {
    "old": "Working",
    "new": "No Backup"
  },
  "BackupFileName": {
    "old": "old\_file.bak",
    "new": "new\_file.bak"
  }
}
```

This keeps the audit table flexible.

\---

# 17\. Soft Delete

Backup records should use soft deletion.

Instead of immediately removing the row:

```text
IsDeleted = 1
DeletedDate = current date/time
DeletedBy = current user
```

Normal dashboard queries should exclude deleted records.

Deleted records should remain available for restoration during the retention period.

\---

# 18\. Deleted Records Page

Create a separate page for deleted records.

Features:

* Search
* Filter
* View deleted date
* View deleted by
* Restore
* Optional permanent deletion for authorized administrators

\---

# 19\. Bulk Delete

The main table should support checkboxes.

Users can:

* Select one record
* Select multiple records
* Bulk delete selected records

A confirmation dialog should appear before deletion.

Every deleted record must be auditable.

\---

# 20\. Restore

Authorized users should be able to restore a soft-deleted record.

Restoring should:

```text
IsDeleted = 0
DeletedDate = NULL
DeletedBy = NULL
```

The restoration itself should be recorded in the audit history.

\---

# 21\. History Retention

The initial proposal is a **30-day retention period**.

History older than 30 days should be automatically removed.

The same retention policy can be applied to soft-deleted records if approved.

The cleanup should run automatically through a scheduled maintenance process.

Do not rely on a user opening the website to perform cleanup.

The retention period should ideally be configurable.

\---

# 22\. Reports

The current weekly PDF/Excel report should be the visual reference for the application's report design.

The current report contains sections such as:

```text
GTEC Production Backup Report
08/17/2026 - 08/23/2026

GTEC OneSys
Day | Date | File Name | Status

GTEC MongoDB
Day | Date | File Name | Status

GTEC
Day | Date | File Name | Status
```

The website should reproduce this general structure.

## Weekly report

Allow the user to select a week and generate:

* PDF
* Excel
* Print

## Monthly report

Allow the user to select a month and generate:

* PDF
* Excel
* Print

\---

# 23\. Report Controls

The UI can use icons/buttons for:

```text
\[ Print ]
\[ PDF ]
\[ Excel ]
```

And report selection:

```text
\[ Weekly ]
\[ Monthly ]
```

Potentially:

```text
\[ Start Date ] \[ End Date ] \[ Generate Report ]
```

Reports should use the same underlying database data as the dashboard so that the report and website cannot accidentally show different information.

\---

# 24\. Authentication and Authorization

Use Microsoft Authentication.

Potential roles:

## Normal User

Can:

* View records
* Search/filter
* View history
* Generate reports
* Print
* Export

## Administrator

Can:

* Manage backup sources
* Configure monitoring
* Update records
* Delete records
* Bulk delete
* Restore records
* View audit history
* Manage retention/configuration
* Perform administrative corrections

The exact roles should follow the company's existing Microsoft authentication/authorization model.

\---

# 25\. Security

The application will need access to backup folders.

Important considerations:

* IIS/application identity must have read access to the backup folder.
* Prefer read-only permissions on backup folders.
* Do not give the web application unnecessary delete/write access to backup files.
* Validate configured paths.
* Do not allow ordinary users to submit arbitrary server paths.
* Protect administration/configuration pages.
* Use parameterized SQL/EF Core.
* Avoid exposing sensitive server information unnecessarily.
* Log scanner errors without exposing sensitive information to normal users.

\---

# 26\. Suggested Pages

## 1\. Backup Dashboard

Main page.

Contains:

* Current backup status
* DataTables
* Filters
* Search
* Pagination
* Report buttons

## 2\. Backup History

Historical backup records.

## 3\. Deleted Records

Soft-deleted records.

Contains restore functionality.

## 4\. Update/Audit History

Shows:

* What changed
* Who changed it
* When it changed
* Previous/new values

## 5\. Backup Source Configuration

Administrators can manage:

* Backup source/database
* Folder
* File pattern
* Expected schedule
* Active/inactive status

## 6\. Scanner/System Status

Shows:

* Last scan
* Scanner status
* Number of files scanned
* New records
* Errors

## 7\. Reports

Optional dedicated report page if report functionality becomes too large for the dashboard.

\---

# 27\. Recommended Architecture

```text
                     BACKUP SERVER / FOLDER
                              |
                              v
                    +-------------------+
                    | Background Scanner|
                    +-------------------+
                              |
                              v
                    +-------------------+
                    | File Parser       |
                    | + Validation      |
                    +-------------------+
                              |
                              v
                    +-------------------+
                    | Duplicate Check   |
                    +-------------------+
                              |
                              v
                    +-------------------+
                    | SQL Server        |
                    +-------------------+
                       |             |
                       |             |
                       v             v
                Backup Records   Audit History
                       |
                       v
               ASP.NET Core Web App
                       |
          +------------+-------------+
          |            |             |
          v            v             v
      Dashboard     History       Reports
                                    |
                              +-----+-----+
                              |           |
                              v           v
                             PDF        Excel
```

\---

# 28\. Recommended Development Phases

## Phase 1 — Requirements

Before coding:

* Review current Excel/PDF.
* Confirm all backup sources.
* Confirm folder locations.
* Confirm filename formats.
* Confirm expected schedule.
* Confirm how backup dates are determined.
* Confirm IIS/server environment.
* Confirm SQL Server location.
* Confirm Microsoft Authentication setup.
* Confirm folder permissions.

## Phase 2 — Database

Design and create:

* `BackupSource`
* `BackupRecord`
* `BackupRecordHistory`

Potentially:

* `ScannerLog`
* `ApplicationConfiguration`

## Phase 3 — Automatic Scanner

Implement:

* Folder scanning
* File recognition
* Filename parsing
* Backup date extraction
* Source identification
* Duplicate detection
* Record insertion
* Missing backup calculation
* Scanner logging

## Phase 4 — Dashboard

Implement:

* Bootstrap layout
* DataTables
* Pagination
* Search
* Sorting
* Filtering
* Status display
* Date filtering

## Phase 5 — CRUD / Audit

Implement:

* Authorized updates
* JSON audit history
* Soft delete
* Bulk delete
* Restore
* Deleted records page
* Audit page

## Phase 6 — Reports

Implement:

* Weekly PDF
* Weekly Excel
* Monthly PDF
* Monthly Excel
* Print-friendly report

Match the existing report's layout as closely as practical.

## Phase 7 — Authentication

Implement:

* Microsoft Authentication
* Authorization
* Administrator permissions

## Phase 8 — Maintenance

Implement:

* 30-day audit cleanup
* 30-day deleted-record cleanup if approved
* Scanner monitoring
* Error logging

## Phase 9 — Deployment

Deploy to IIS/UAT.

Verify:

* IIS permissions
* Backup folder access
* SQL Server access
* Scanner execution
* Authentication
* Scheduled scanning
* Report generation
* Cleanup jobs

\---

# 29\. Questions to Finalize Before Coding

These questions should be answered before the final database schema is created.

### Backup source

1. What are all the backup sources/databases that need to be monitored?
2. Are all backup sources located in one folder?
3. Are some backup folders located on another server?
4. Can the IIS/application account access those folders?

### Filename

5. What is the exact filename pattern for each backup source?
6. Does every filename contain the backup date?
7. Does every filename contain the backup time?
8. Is the date in the filename always the actual backup date?

### Schedule

9. Are all sources expected to back up every day?
10. Are weekends included?
11. Does any source have a different schedule?
12. Should the schedule be configurable by administrators?

### Scanner

13. How often should the scanner run?
14. Once per day?
15. Every hour?
16. Every 30 minutes?
17. What should happen if the folder cannot be accessed?

### Status

18. What exactly qualifies as `Working`?
19. Is file existence enough?
20. Should file size be checked?
21. Should file age/time be checked?
22. Should the actual backup contents be validated?

### Records

23. Should backup records be editable manually?
24. Which fields should be editable?
25. Should regular users be able to update anything?
26. Who can delete records?
27. Who can restore records?

### Retention

28. Does the 30-day cleanup apply only to audit history?
29. Should deleted backup records also be permanently removed after 30 days?
30. Should the retention period be configurable?

### Reports

31. Should the website's PDF look exactly like the current PDF?
32. Should the Excel export look exactly like the current Excel?
33. Should weekly reports always be Monday-Sunday?
34. Should monthly reports be calendar-month reports?

### Hosting

35. Will the application run on the same IIS server as another internal application?
36. Will the backup folder be a local folder or a network share?
37. What account will the IIS application/scanner run under?
38. Is SQL Server on the same server or a different server?

### Authentication

39. What Microsoft Authentication setup is already available?
40. Are there existing application roles/groups that can be reused?

### Future features

41. Should the system eventually send email/Teams notifications when a backup is missing?
42. Should the system support multiple backup types such as Full/Differential/Log?
43. Should the system support multiple backup servers?

\---

# 30\. Initial MVP

The first version should focus on replacing the manual weekly process.

### MVP should include

* Automatic folder scanning
* Backup source configuration
* Expected backup schedule
* Backup date detection
* Working / No Backup status
* Main DataTables dashboard
* Search
* Filtering
* Sorting
* Pagination
* Weekly history
* Soft deletion
* Restore
* Audit/update history
* Weekly PDF export
* Weekly Excel export
* Monthly PDF export
* Monthly Excel export
* Print
* Microsoft Authentication
* IIS deployment

### Features that can come later

* Email notifications
* Teams notifications
* Charts/dashboard analytics
* Multiple backup types
* Advanced monitoring
* Additional automation
* More sophisticated alerting

\---

# 31\. Design Principle

The application should automate the work rather than simply move the existing manual Excel process into a browser.

The intended end result is:

```text
CURRENT

Remote
  ↓
Find files
  ↓
Copy filenames
  ↓
Update Excel
  ↓
Check missing records
  ↓
Create PDF
  ↓
Send to team


NEW

Automatic Scanner
  ↓
SQL Server
  ↓
Website
  ↓
Team checks status themselves
  ↓
PDF / Excel / Print when needed
```

The website should become the **single place to check backup status and history**.

The manual Monday reporting process should no longer be necessary once the automatic scanner and reporting system are proven reliable.

