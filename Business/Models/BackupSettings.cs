namespace Business.Models;

public sealed class BackupSettings
{
    public string TargetDirectory { get; set; } = string.Empty;
    public IReadOnlyList<BackupSourceMapping> Sources { get; set; } = [];
    public IReadOnlyList<BackupFileFormat> Formats { get; set; } = [];
    public IReadOnlyList<BackupMarkerColor> Colors { get; set; } = [];
    public IReadOnlyList<BackupStatusOption> Statuses { get; set; } = [];
}
