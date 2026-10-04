# Working with an AI agent in this project

This file is persistent guidance for AI coding sessions. It is not application code.

## Before changing the project

Read these references first:

1. `../Plan.md` — the main product brief and requirements.
2. `PROJECT_ARCHITECTURE.txt` — project boundaries, Dapper/stored-procedure rules, DTO placement, and request flow.
3. `BACKUP_MONITORING_SITE_PLAN.txt` — the current dashboard/report feature plan.
4. `SampleCode.txt` — the Dapper stored-procedure reference.

Follow the user's latest explicit direction if it updates a document. If references conflict, surface the conflict and prioritize the latest clear direction.

## Project boundaries

- The solution has separate `GTECBackupReport` (web), `Service`, `Business`, and `DataAccess` projects.
- Keep the web project focused on Controllers, Views, host composition, and static web assets.
- Put domain/business models in `Business/Models`.
- Put request and response DTOs in `Service/Contracts/Requests` and `Service/Contracts/Responses`.
- Put application/use-case coordination in Service.
- DataAccess uses Dapper to call SQL Server stored procedures. Do not place inline SQL queries in C# source.
- Browser scripts and AJAX requests belong in `GTECBackupReport/wwwroot/scripts`; avoid inline JavaScript in Razor views.
- Use the locally vendored SweetAlert2 helpers for browser notifications and confirmation prompts.
- Backup file downloads are future work and must be restricted to authorized users if implemented.

## Collaboration notes

Explain technical choices in beginner-friendly language. Before implementation, state the intended scope when a task has multiple layers. Keep architecture and feature documents current when decisions settle. Do not put credentials, production backup data, or sensitive server paths in source control.

You can ask for a plan first, ask for one small step at a time, or steer the work while it is in progress. Review important changes before deployment or use with real backups.
