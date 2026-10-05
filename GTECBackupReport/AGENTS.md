# Working with an AI agent in this project

## Read these references first

1. `Plan.md` - current implemented features, limits, and next work.
2. `wiki/Home.md` and linked wiki pages - current user-facing behavior and project notes.
3. `PROJECT_ARCHITECTURE.txt` - project boundaries and request flow.
4. `SampleCode.txt` - Dapper and stored-procedure coding reference.
5. `../Plan.md` - broader product goals when relevant.

Use the local `Plan.md` as the source of truth for current implementation. `../Plan.md` is the broader product brief, not a description of the current UI. Follow the user's latest explicit direction if it updates a document. If references conflict, prioritize the latest clear direction and update the affected docs.

## Project boundaries

- The solution has separate `GTECBackupReport` (web), `Service`, `Business`, and `DataAccess` projects.
- Keep the web project focused on Controllers, Views, host composition, and static web assets.
- Put domain/business models in `Business/Models`.
- Put request and response DTOs in `Service/Contracts/Requests` and `Service/Contracts/Responses`.
- Put application/use-case coordination in Service.
- DataAccess uses Dapper to call SQL Server stored procedures. Do not put inline SQL queries in C# source.
- Browser scripts and AJAX requests belong in `GTECBackupReport/wwwroot/scripts`; avoid inline JavaScript in Razor views.
- Use the locally vendored SweetAlert2 helpers for notifications and confirmations.
- File downloads are future work and must be restricted to authorized users if implemented.

## Collaboration notes

Explain technical choices in beginner-friendly language. For multi-layer tasks, state the intended scope. Keep the plan and wiki current when decisions settle. Do not put credentials, production backup data, or sensitive server paths in source control.