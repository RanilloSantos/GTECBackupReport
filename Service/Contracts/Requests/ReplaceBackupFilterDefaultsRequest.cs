namespace Service.Contracts.Requests;

public sealed class ReplaceBackupFilterDefaultsRequest
{
    public string Period { get; set; } = "week";
    public string Source { get; set; } = "all-databases";
    public string Status { get; set; } = string.Empty;
    public string Format { get; set; } = string.Empty;
}
