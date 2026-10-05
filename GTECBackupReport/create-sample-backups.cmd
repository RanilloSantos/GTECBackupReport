@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "TARGET=%~1"
if not defined TARGET set /p "TARGET=Enter the target backup directory: "
if not defined TARGET (
    echo A target directory is required.
    exit /b 1
)

if not exist "%TARGET%\." mkdir "%TARGET%"
if errorlevel 1 (
    echo Could not create or access "%TARGET%".
    exit /b 1
)

for /L %%N in (1,1,37) do (
    set /a "KIND=%%N %% 6"
    set "RANDOM_ID=!RANDOM!!RANDOM!_%%N"
    if !KIND! equ 0 (
        > "%TARGET%\GTECOnesys_backup_2026_10_05_!RANDOM_ID!.bak" echo Sample backup file %%N
    ) else if !KIND! equ 1 (
        > "%TARGET%\GTEC_PROD_database__Mon__10-05-2026__!RANDOM_ID!.archive" echo Sample backup file %%N
    ) else if !KIND! equ 2 (
        > "%TARGET%\GTEC_backup_2026_10_05_!RANDOM_ID!.zip" echo Sample backup file %%N
    ) else if !KIND! equ 3 (
        > "%TARGET%\Database_Export_!RANDOM_ID!.sql" echo Sample backup file %%N
    ) else if !KIND! equ 4 (
        > "%TARGET%\ServiceDump_!RANDOM_ID!.dump" echo Sample backup file %%N
    ) else (
        > "%TARGET%\Archive_!RANDOM_ID!.tar.gz" echo Sample backup file %%N
    )
)

echo Created 37 sample files under "%TARGET%".
echo Run the web app on a host that can read this directory, then set the same path in Backup settings.