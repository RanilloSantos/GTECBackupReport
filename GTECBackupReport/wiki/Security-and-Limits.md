# Security and Current Limits

- The scan API requires an authenticated user.
- The settings gear is rendered only for signed-in users; there are no admin roles yet.
- Settings are stored in local storage, which is specific to that browser and can be edited by its user.
- The browser submits an absolute directory path to the scan API. The web server can read any path available to its process account, so production use needs server-side configured roots/allow-listing and role checks.
- Configure the web server account with read-only access to the required backup directory. Do not commit production paths, backup files, or credentials.
- The scanner does not open or validate backup contents. A file's presence is not proof that it can be restored.
- No download action exists. If added later, enforce authorization on the server and audit downloads.
- There is no scheduled scanner, persistent report history, audit log, or automated retention cleanup yet.