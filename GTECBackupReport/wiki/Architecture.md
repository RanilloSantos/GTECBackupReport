# Architecture and Data Flow

## Solution layers

- **GTECBackupReport** — ASP.NET Core MVC host, controllers, views, Identity UI, and static browser assets.
- **Service** — application operations and HTTP request/response contracts. It includes directory scanning and backup settings coordination.
- **Business** — backup settings models and repository abstractions.
- **DataAccess** — Dapper repositories that call SQL Server stored procedures for shared settings. Scan results are not yet persisted here.

## Authentication storage

ASP.NET Core Identity is backed by SQL Server through EF Core (`ApplicationDbContext` and `UseSqlServer`). The development connection string in `appsettings.json` targets `GTECBackupMonitor` on LocalDB. Its Identity schema is provisioned and existing accounts were copied from the former LocalDB database; the source remains intact. Set `ConnectionStrings__DefaultConnection` in deployment configuration for another SQL Server without storing credentials in source control. To provision a new database, run [`Database/Scripts/IdentitySchema.sql`](../Database/Scripts/IdentitySchema.sql). If moving accounts between databases on the same SQL Server instance, run [`Database/Scripts/MigrateIdentityData.sql`](../Database/Scripts/MigrateIdentityData.sql) from the destination after provisioning it.

See [PROJECT_ARCHITECTURE.txt](../PROJECT_ARCHITECTURE.txt) for the full intended layering rules.

## Current scan flow

```text
Dashboard JavaScript
  -> authenticated POST /api/backup-files/scan
  -> BackupFilesController
  -> IBackupDirectoryScanner in Service
  -> recursive filesystem metadata scan
  -> response DTOs
  -> dashboard builds report rows and expected missing rows
```

Backup settings load from SQL Server. For an authenticated scan, the browser sends the configured root path to the scan endpoint. The scan returns file name, relative path, extension, modified date, and modified timestamp. It caps results at 10,000 files and does not read file contents.

Signed-in users load and save personal default report filters through `BackupSettingsController` and the `pr_UserFilterDefaults_Get` / `pr_UserFilterDefaults_Replace` stored procedures. Apply [`Database/Scripts/UserFilterDefaults.sql`](../Database/Scripts/UserFilterDefaults.sql) after the Identity schema exists.

## Settings flow

```text
Dashboard / settings modal
  -> GET /api/backup-settings (load settings and dropdown values)
  -> authenticated, anti-forgery protected PUT /api/backup-settings
  -> BackupSettingsController
  -> IBackupSettingsService in Service
  -> IBackupSettingsRepository in Business
  -> BackupSettingsRepository (Dapper)
  -> pr_Settings_Get / pr_Settings_Replace stored procedures
  -> GTECBackupMonitor settings tables
```

## Browser files

- `wwwroot/scripts/backup-report-dashboard.js` — date ranges, filters, search, table, printing, and scan request.
- `wwwroot/scripts/backup-mappings.js` — directory, mapping, format, and color settings.
- `wwwroot/scripts/auth-modals.js` — AJAX Identity login/registration modal behavior.
- `wwwroot/scripts/backup-alerts.js` — SweetAlert notifications and confirmations.
