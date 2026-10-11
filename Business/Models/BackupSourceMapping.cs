namespace Business.Models;

public sealed class BackupSourceMapping
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Patterns { get; set; } = string.Empty;
    public string Folder { get; set; } = string.Empty;
    public int ColorId { get; set; }
    public string ColorValue { get; set; } = "#859297";
    public string Schedule { get; set; } = "Daily";
    public bool Active { get; set; }
}
