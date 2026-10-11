namespace Service.Contracts.Requests;

public sealed class ReplaceBackupSettingsRequest
{
    public string TargetDirectory { get; set; } = string.Empty;
    public List<BackupSourceSettingRequest> Sources { get; set; } = [];
    public List<BackupFileFormatSettingRequest> Formats { get; set; } = [];
    public List<BackupMarkerColorSettingRequest> Colors { get; set; } = [];
}

public sealed class BackupSourceSettingRequest
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Patterns { get; set; } = string.Empty;
    public string Folder { get; set; } = string.Empty;
    public int ColorId { get; set; }
    public string Schedule { get; set; } = string.Empty;
    public bool Active { get; set; }
}

public sealed class BackupFileFormatSettingRequest
{
    public string Extension { get; set; } = string.Empty;
    public bool Active { get; set; }
}

public sealed class BackupMarkerColorSettingRequest
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}
