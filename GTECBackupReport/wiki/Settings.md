# Settings and File Mappings

Open Backup settings with the gear beside **Backup records**. The control is shown to signed-in users.

## Target directory

Enter an absolute path visible and readable by the web server account, for example a local server folder or UNC share. The scanner includes files in subfolders and all file types. It reads file names and metadata, not backup contents.

The path is saved in browser local storage. Each browser/user currently has its own settings.

## Database mappings

A mapping gives files a database name, marker color, and expected schedule. Filename patterns use `*` as a wildcard and can be separated by semicolons. An optional folder scope limits matching to paths containing that text. Mappings can be added, edited, activated, deactivated, and deleted.

When multiple active mappings match a file, the file is treated as Unmapped for review.

## File formats

Add or remove extensions and choose whether each appears in the File format filter. The directory scan still discovers all file types, including unconfigured extensions.

## Marker colors

In Add/Edit Database Mapping, use **Add color** beside Marker color. The color manager lets you name a color, choose it with the color picker, and delete saved colors. Colors and mappings are committed when **Save settings** is pressed. Removing a color moves mappings using it to another available color. At least one color must remain.