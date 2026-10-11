using System.Data;
using System.Text.Json;
using Business.Interfaces;
using Business.Models;
using Dapper;
using Microsoft.Data.SqlClient;

namespace DataAccess.Repositories;

public sealed class BackupSettingsRepository : IBackupSettingsRepository
{
    private const string GetProcedure = "dbo.pr_Settings_Get";
    private const string ReplaceProcedure = "dbo.pr_Settings_Replace";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly string _connectionString;

    public BackupSettingsRepository(string connectionString)
    {
        _connectionString = string.IsNullOrWhiteSpace(connectionString)
            ? throw new ArgumentException("A SQL Server connection string is required.", nameof(connectionString))
            : connectionString;
    }

    public async Task<BackupSettings> GetBackupSettingsAsync(CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        var command = new CommandDefinition(GetProcedure, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
        using var results = await connection.QueryMultipleAsync(command);
        var settings = new BackupSettings
        {
            TargetDirectory = await results.ReadSingleAsync<string>(),
            Sources = (await results.ReadAsync<BackupSourceMapping>()).AsList(),
            Colors = (await results.ReadAsync<BackupMarkerColor>()).AsList(),
            Formats = (await results.ReadAsync<BackupFileFormat>()).AsList(),
            Statuses = (await results.ReadAsync<BackupStatusOption>()).AsList()
        };
        return settings;
    }

    public async Task ReplaceBackupSettingsAsync(BackupSettings settings, CancellationToken cancellationToken)
    {
        var parameters = new
        {
            TargetDirectory = settings.TargetDirectory,
            SourcesJson = JsonSerializer.Serialize(settings.Sources, JsonOptions),
            FormatsJson = JsonSerializer.Serialize(settings.Formats, JsonOptions),
            ColorsJson = JsonSerializer.Serialize(settings.Colors, JsonOptions)
        };

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        var command = new CommandDefinition(ReplaceProcedure, parameters, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
        await connection.ExecuteAsync(command);
    }
}
