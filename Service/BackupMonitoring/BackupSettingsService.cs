using System.Text.RegularExpressions;
using Business.Interfaces;
using Business.Models;
using Service.Contracts.Requests;
using Service.Contracts.Responses;

namespace Service.BackupMonitoring;

public sealed class BackupSettingsService(IBackupSettingsRepository repository) : IBackupSettingsService
{
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
}
