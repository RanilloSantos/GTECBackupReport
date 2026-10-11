using System.Text.RegularExpressions;
using Business.Interfaces;
using Business.Models;
using Service.Contracts.Requests;
using Service.Contracts.Responses;

namespace Service.BackupMonitoring;

public sealed class BackupSettingsService(IBackupSettingsRepository repository) : IBackupSettingsService
{
    private static readonly HashSet<string> BuiltInSources = new(StringComparer.OrdinalIgnoreCase)
    {
        "all-databases", "all-files", "unmapped-only"
    };
    private static readonly HashSet<string> AllowedPeriods = new(StringComparer.OrdinalIgnoreCase)
    {
        "week", "month", "custom"
    };
    private static readonly HashSet<string> AllowedSchedules = new(StringComparer.OrdinalIgnoreCase)
    {
        "Daily", "Weekdays", "Weekly"
    };

    public async Task<BackupSettingsResponse> GetBackupSettingsAsync(CancellationToken cancellationToken)
    {
        var settings = await repository.GetBackupSettingsAsync(cancellationToken);
        return new BackupSettingsResponse
        {
            TargetDirectory = settings.TargetDirectory,
            Sources = settings.Sources.Select(source => new BackupSourceSettingResponse
            {
                Id = source.Id,
                Name = source.Name,
                Patterns = source.Patterns,
                Folder = source.Folder,
                ColorId = source.ColorId,
                ColorValue = source.ColorValue,
                Schedule = source.Schedule,
                Active = source.Active
            }).ToList(),
            Formats = settings.Formats.Select(format => new BackupFileFormatSettingResponse
            {
                Extension = format.Extension,
                Active = format.Active
            }).ToList(),
            Colors = settings.Colors.Select(color => new BackupMarkerColorSettingResponse
            {
                Id = color.Id,
                Name = color.Name,
                Value = color.Value
            }).ToList(),
            Statuses = settings.Statuses.Select(status => new BackupStatusOptionResponse
            {
                Value = status.Value,
                Label = status.Label
            }).ToList()
        };
    }

    public Task ReplaceBackupSettingsAsync(ReplaceBackupSettingsRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var sources = request.Sources ?? throw new ArgumentException("Backup sources are required.");
        var formats = request.Formats ?? throw new ArgumentException("File formats are required.");
        var colors = request.Colors ?? throw new ArgumentException("Marker colors are required.");
        if ((request.TargetDirectory?.Length ?? 0) > 2048)
            throw new ArgumentException("The target directory path is too long.");
        if (sources.Count > 500 || formats.Count > 200 || colors.Count > 100)
            throw new ArgumentException("The settings contain too many entries.");

        var colorIds = colors.Select(color => color.Id).ToHashSet();
        if (colorIds.Count != colors.Count || colors.Any(color => color.Id <= 0))
            throw new ArgumentException("Marker color IDs must be unique and valid.");
        if (colors.Any(color => string.IsNullOrWhiteSpace(color.Name) || color.Name.Length > 32 || string.IsNullOrWhiteSpace(color.Value) || !Regex.IsMatch(color.Value, "^#[0-9a-fA-F]{6}$")))
            throw new ArgumentException("Each marker color needs a name and a six-digit hex value.");

        var sourceNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var sourceIds = new HashSet<int>();
        foreach (var source in sources)
        {
            if (source.Id <= 0 || string.IsNullOrWhiteSpace(source.Name) || source.Name.Length > 80 ||
                string.IsNullOrWhiteSpace(source.Patterns) || source.Patterns.Length > 300 || (source.Folder?.Length ?? 0) > 300 ||
                string.IsNullOrWhiteSpace(source.Schedule) || !AllowedSchedules.Contains(source.Schedule) || !colorIds.Contains(source.ColorId))
                throw new ArgumentException("A backup source has invalid or missing settings.");
            if (!sourceIds.Add(source.Id))
                throw new ArgumentException("Backup source IDs must be unique.");
            if (!sourceNames.Add(source.Name.Trim()))
                throw new ArgumentException("Backup source names must be unique.");
        }

        var formatNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var format in formats)
        {
            var extension = (format.Extension ?? string.Empty).Trim().ToLowerInvariant();
            if (extension.Length > 32 || !Regex.IsMatch(extension, "^\\.[a-z0-9][a-z0-9._+-]*$"))
                throw new ArgumentException("File formats must be extensions such as .bak or .tar.gz.");
            if (!formatNames.Add(extension))
                throw new ArgumentException("File formats must be unique.");
            format.Extension = extension;
        }

        return repository.ReplaceBackupSettingsAsync(new BackupSettings
        {
            TargetDirectory = request.TargetDirectory?.Trim() ?? string.Empty,
            Sources = sources.Select(source => new BackupSourceMapping
            {
                Id = source.Id,
                Name = source.Name.Trim(),
                Patterns = source.Patterns.Trim(),
                Folder = source.Folder?.Trim() ?? string.Empty,
                ColorId = source.ColorId,
                Schedule = source.Schedule,
                Active = source.Active
            }).ToList(),
            Formats = formats.Select(format => new BackupFileFormat
            {
                Extension = format.Extension,
                Active = format.Active
            }).ToList(),
            Colors = colors.Select(color => new BackupMarkerColor
            {
                Id = color.Id,
                Name = color.Name.Trim(),
                Value = color.Value.ToLowerInvariant()
            }).ToList()
        }, cancellationToken);
    }

    public async Task<BackupFilterDefaultsResponse> GetUserFilterDefaultsAsync(string userId, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userId);
        var defaults = await repository.GetUserFilterDefaultsAsync(userId, cancellationToken);
        var settings = await repository.GetBackupSettingsAsync(cancellationToken);
        return NormalizeFilterDefaults(defaults, settings);
    }

    public async Task ReplaceUserFilterDefaultsAsync(string userId, ReplaceBackupFilterDefaultsRequest request, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userId);
        ArgumentNullException.ThrowIfNull(request);
        var period = (request.Period ?? string.Empty).Trim();
        var source = (request.Source ?? string.Empty).Trim();
        var status = (request.Status ?? string.Empty).Trim();
        var format = (request.Format ?? string.Empty).Trim();
        if (!AllowedPeriods.Contains(period))
            throw new ArgumentException("Choose Weekly, Monthly, or Custom as the default report period.");
        if (source.Length > 80 || status.Length > 32 || format.Length > 32)
            throw new ArgumentException("A default filter value is too long.");

        var settings = await repository.GetBackupSettingsAsync(cancellationToken);
        var sourceIsValid = BuiltInSources.Contains(source) || settings.Sources.Any(item => item.Active && string.Equals(item.Name, source, StringComparison.OrdinalIgnoreCase));
        var statusIsValid = status.Length == 0 || settings.Statuses.Any(item => string.Equals(item.Value, status, StringComparison.OrdinalIgnoreCase));
        var formatIsValid = format.Length == 0 || settings.Formats.Any(item => item.Active && string.Equals(item.Extension, format, StringComparison.OrdinalIgnoreCase));
        if (!sourceIsValid || !statusIsValid || !formatIsValid)
            throw new ArgumentException("Choose default values from the available filter options.");

        await repository.ReplaceUserFilterDefaultsAsync(userId, new BackupFilterDefaults
        {
            Period = period.ToLowerInvariant(),
            Source = source,
            Status = status,
            Format = format
        }, cancellationToken);
    }

    private static BackupFilterDefaultsResponse NormalizeFilterDefaults(BackupFilterDefaults defaults, BackupSettings settings)
    {
        var source = BuiltInSources.Contains(defaults.Source)
            ? BuiltInSources.First(value => string.Equals(value, defaults.Source, StringComparison.OrdinalIgnoreCase))
            : settings.Sources.FirstOrDefault(item => item.Active && string.Equals(item.Name, defaults.Source, StringComparison.OrdinalIgnoreCase))?.Name;
        var status = settings.Statuses.FirstOrDefault(item => string.Equals(item.Value, defaults.Status, StringComparison.OrdinalIgnoreCase))?.Value ?? string.Empty;
        var format = settings.Formats.FirstOrDefault(item => item.Active && string.Equals(item.Extension, defaults.Format, StringComparison.OrdinalIgnoreCase))?.Extension ?? string.Empty;
        return new BackupFilterDefaultsResponse
        {
            Period = AllowedPeriods.Contains(defaults.Period) ? defaults.Period.ToLowerInvariant() : "week",
            Source = source ?? "all-databases",
            Status = status,
            Format = format
        };
    }
}
