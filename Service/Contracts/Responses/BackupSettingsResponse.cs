namespace Service.Contracts.Responses;

public sealed class BackupSettingsResponse
{
    public string TargetDirectory { get; set; } = string.Empty;
    public IReadOnlyList<BackupSourceSettingResponse> Sources { get; set; } = [];
    public IReadOnlyList<BackupFileFormatSettingResponse> Formats { get; set; } = [];
    public IReadOnlyList<BackupMarkerColorSettingResponse> Colors { get; set; } = [];
    public IReadOnlyList<BackupStatusOptionResponse> Statuses { get; set; } = [];
}

public sealed class BackupSourceSettingResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Patterns { get; set; } = string.Empty;
    public string Folder { get; set; } = string.Empty;
    public int ColorId { get; set; }
    public string ColorValue { get; set; } = string.Empty;
    public string Schedule { get; set; } = string.Empty;
    public bool Active { get; set; }
}

public sealed class BackupFileFormatSettingResponse
{
    public string Extension { get; set; } = string.Empty;
    public bool Active { get; set; }
}

public sealed class BackupMarkerColorSettingResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public sealed class BackupStatusOptionResponse
{
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}
