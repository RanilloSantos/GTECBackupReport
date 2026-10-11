# Settings and File Mappings

Open Backup settings with the gear beside **Backup records**. The control is shown to signed-in users.

## Target directory

Enter an absolute path visible and readable by the web server account, for example a local server folder or UNC share. The scanner includes files in subfolders and all file types. It reads file names and metadata, not backup contents.

The path is stored in SQL Server and shared by users. It starts blank; enter the server-visible path in Backup settings. Legacy browser-local settings are removed the first time each browser loads the updated page.

## Database mappings

A mapping gives files a database name, marker color, and expected schedule. Filename patterns use `*` as a wildcard and can be separated by semicolons. An optional folder scope limits matching to paths containing that text. Mappings can be added, edited, activated, deactivated, and deleted. Mappings are stored in SQL Server and start empty.

Mapping and marker color IDs are compact integers stored in SQL Server.

Settings are stored in the `MonitorSettings`, `MarkerColors`, `Sources`, `FileFormats`, and `Statuses` tables. Database procedures use the `pr_` prefix. Existing databases can apply `Database/Scripts/MigrateSettingsNames.sql`, then rerun `Database/Scripts/BackupSettings.sql` to install the renamed procedures.

When multiple active mappings match a file, the file is treated as Unmapped for review.

## File formats

Add or remove extensions and choose whether each appears in the File format filter. The directory scan still discovers all file types, including unconfigured extensions. Formats are stored in SQL Server; a new database starts with `.bak` active. The Backup source, Status, and File format filters initially show a blank prompt.

## Marker colors

In Add/Edit Database Mapping, use **Add color** beside Marker color. The color manager lets you name a color, choose it with the color picker, and delete saved colors. Colors and mappings are committed to SQL Server when **Save settings** is pressed. Removing a color moves mappings using it to another available color; a color used by a source cannot be removed until another color is available.
