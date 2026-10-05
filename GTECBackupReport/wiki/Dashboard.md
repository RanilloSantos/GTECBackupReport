# Dashboard

## Date views

- **Weekly** shows the last seven days, including today.
- **Monthly** shows the first day of the current month through today.
- **Custom** initially shows January 1 of the current year through today; either date can be changed.

## Filters and search

- **All databases** shows mapped database records and expected missing records, excluding unmapped files.
- **All files** includes mapped, unmapped, and expected-missing records.
- A database name or **Unmapped** narrows the report to that choice.
- Status and file format filters can be combined with database filtering.
- Add filename or path terms one at a time. A row matches any confirmed search term; remove a term with its x button.

## Table and actions

The columns are Day, Date, Database / Backup Source, File Name / Format, Status, and Details. The database marker uses the mapping color. Details show the relative path and available file timestamps. Sortable headings use arrows. Pagination and page size controls are available.

**Print report** prints the currently filtered results. Direct file download and PDF/Excel export are not implemented.

## Status meaning

- **Working** — a file matched an active mapping.
- **No Backup** — an expected scheduled row has no matching file for that date.
- **Unmapped** — a discovered file did not match exactly one active mapping.

The current scan uses the file's modified date as its backup date. It does not inspect file contents.

> Current limitation: the dashboard can generate No Backup rows before a directory scan succeeds, including when no directory is configured. Treat missing-backup counts as provisional until this is fixed.