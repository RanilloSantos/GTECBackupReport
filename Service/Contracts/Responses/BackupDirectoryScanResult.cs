namespace Service.Contracts.Responses;

public sealed record BackupFileDto(string Id, string RelativePath, string FileName, string Extension, string Date, string ModifiedAt);

public sealed record BackupDirectoryScanResult(IReadOnlyList<BackupFileDto> Files, bool Truncated);