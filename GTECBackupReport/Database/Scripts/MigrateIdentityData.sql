/*
  Copies existing ASP.NET Core Identity data from the previous LocalDB database
  into GTECBackupMonitor. Run IdentitySchema.sql in GTECBackupMonitor first.

  Both databases must be on the same SQL Server instance. This script copies
  user/role IDs, password hashes, security stamps, claims, logins, and tokens.
  It does not copy unrelated application data or delete the source records.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'GTECBackupMonitor'
    THROW 51000, 'Select the GTECBackupMonitor destination database before running this script.', 1;

IF DB_ID(N'aspnet-GTECBackupReport-6ba99fc2-0580-46e5-85ca-1a61cc7cecfe') IS NULL
    THROW 51001, 'The previous LocalDB Identity database was not found on this SQL Server instance.', 1;

IF OBJECT_ID(N'dbo.AspNetUsers', N'U') IS NULL OR OBJECT_ID(N'dbo.AspNetRoles', N'U') IS NULL
    THROW 51002, 'IdentitySchema.sql must be run in the destination database first.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    INSERT dbo.AspNetRoles (Id, Name, NormalizedName, ConcurrencyStamp)
    SELECT s.Id, s.Name, s.NormalizedName, s.ConcurrencyStamp
    FROM [aspnet-GTECBackupReport-6ba99fc2-0580-46e5-85ca-1a61cc7cecfe].dbo.AspNetRoles AS s
    WHERE NOT EXISTS (SELECT 1 FROM dbo.AspNetRoles AS d WHERE d.Id = s.Id);

    INSERT dbo.AspNetUsers
        (Id, UserName, NormalizedUserName, Email, NormalizedEmail, EmailConfirmed,
         PasswordHash, SecurityStamp, ConcurrencyStamp, PhoneNumber, PhoneNumberConfirmed,
         TwoFactorEnabled, LockoutEnd, LockoutEnabled, AccessFailedCount)
    SELECT s.Id, s.UserName, s.NormalizedUserName, s.Email, s.NormalizedEmail, s.EmailConfirmed,
           s.PasswordHash, s.SecurityStamp, s.ConcurrencyStamp, s.PhoneNumber, s.PhoneNumberConfirmed,
           s.TwoFactorEnabled, s.LockoutEnd, s.LockoutEnabled, s.AccessFailedCount
    FROM [aspnet-GTECBackupReport-6ba99fc2-0580-46e5-85ca-1a61cc7cecfe].dbo.AspNetUsers AS s
    WHERE NOT EXISTS (SELECT 1 FROM dbo.AspNetUsers AS d WHERE d.Id = s.Id);

    SET IDENTITY_INSERT dbo.AspNetRoleClaims ON;
    INSERT dbo.AspNetRoleClaims (Id, RoleId, ClaimType, ClaimValue)
    SELECT s.Id, s.RoleId, s.ClaimType, s.ClaimValue
    FROM [aspnet-GTECBackupReport-6ba99fc2-0580-46e5-85ca-1a61cc7cecfe].dbo.AspNetRoleClaims AS s
    WHERE NOT EXISTS (SELECT 1 FROM dbo.AspNetRoleClaims AS d WHERE d.Id = s.Id);
    SET IDENTITY_INSERT dbo.AspNetRoleClaims OFF;

    SET IDENTITY_INSERT dbo.AspNetUserClaims ON;
    INSERT dbo.AspNetUserClaims (Id, UserId, ClaimType, ClaimValue)
    SELECT s.Id, s.UserId, s.ClaimType, s.ClaimValue
    FROM [aspnet-GTECBackupReport-6ba99fc2-0580-46e5-85ca-1a61cc7cecfe].dbo.AspNetUserClaims AS s
    WHERE NOT EXISTS (SELECT 1 FROM dbo.AspNetUserClaims AS d WHERE d.Id = s.Id);
    SET IDENTITY_INSERT dbo.AspNetUserClaims OFF;

    INSERT dbo.AspNetUserLogins (LoginProvider, ProviderKey, ProviderDisplayName, UserId)
    SELECT s.LoginProvider, s.ProviderKey, s.ProviderDisplayName, s.UserId
    FROM [aspnet-GTECBackupReport-6ba99fc2-0580-46e5-85ca-1a61cc7cecfe].dbo.AspNetUserLogins AS s
    WHERE NOT EXISTS
        (SELECT 1 FROM dbo.AspNetUserLogins AS d
         WHERE d.LoginProvider = s.LoginProvider AND d.ProviderKey = s.ProviderKey);

    INSERT dbo.AspNetUserRoles (UserId, RoleId)
    SELECT s.UserId, s.RoleId
    FROM [aspnet-GTECBackupReport-6ba99fc2-0580-46e5-85ca-1a61cc7cecfe].dbo.AspNetUserRoles AS s
    WHERE NOT EXISTS
        (SELECT 1 FROM dbo.AspNetUserRoles AS d WHERE d.UserId = s.UserId AND d.RoleId = s.RoleId);

    INSERT dbo.AspNetUserTokens (UserId, LoginProvider, Name, Value)
    SELECT s.UserId, s.LoginProvider, s.Name, s.Value
    FROM [aspnet-GTECBackupReport-6ba99fc2-0580-46e5-85ca-1a61cc7cecfe].dbo.AspNetUserTokens AS s
    WHERE NOT EXISTS
        (SELECT 1 FROM dbo.AspNetUserTokens AS d
         WHERE d.UserId = s.UserId AND d.LoginProvider = s.LoginProvider AND d.Name = s.Name);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    IF OBJECT_ID(N'dbo.AspNetRoleClaims', N'U') IS NOT NULL
        SET IDENTITY_INSERT dbo.AspNetRoleClaims OFF;
    IF OBJECT_ID(N'dbo.AspNetUserClaims', N'U') IS NOT NULL
        SET IDENTITY_INSERT dbo.AspNetUserClaims OFF;
    THROW;
END CATCH;
