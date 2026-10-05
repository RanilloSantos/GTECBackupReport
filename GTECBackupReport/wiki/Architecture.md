# Architecture and Data Flow

## Solution layers

- **GTECBackupReport** — ASP.NET Core MVC host, controllers, views, Identity UI, and static browser assets.
- **Service** — application operations and HTTP request/response contracts. The directory scanner currently lives here.
- **Business** — intended location for domain models and business rules; the backup monitor feature does not yet use a Business implementation.
- **DataAccess** — intended Dapper repositories that call SQL Server stored procedures; it is not yet connected to the current backup scan feature.

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

The root path and mappings are currently sent/stored in the browser. The scan returns file name, relative path, extension, modified date, and modified timestamp. It caps results at 10,000 files and does not read file contents.

## Browser files

- `wwwroot/scripts/backup-report-dashboard.js` — date ranges, filters, search, table, printing, and scan request.
- `wwwroot/scripts/backup-mappings.js` — directory, mapping, format, and color settings.
- `wwwroot/scripts/auth-modals.js` — AJAX Identity login/registration modal behavior.
- `wwwroot/scripts/backup-alerts.js` — SweetAlert notifications and confirmations.