using System.Globalization;
using Service.Contracts.Responses;

namespace Service.BackupMonitoring;

public interface IBackupDirectoryScanner
{
    BackupDirectoryScanResult Scan(string directoryPath);
}

public sealed class BackupDirectoryScanner : IBackupDirectoryScanner
{
    private const int MaximumFiles = 10000;

    public BackupDirectoryScanResult Scan(string directoryPath)
    {
        if (string.IsNullOrWhiteSpace(directoryPath) || !Path.IsPathFullyQualified(directoryPath))
            throw new ArgumentException("Enter an absolute directory path visible to the web server.", nameof(directoryPath));

        var root = Path.GetFullPath(directoryPath.Trim());
        if (!Directory.Exists(root))
            throw new DirectoryNotFoundException("The directory does not exist or is not visible to the web server.");

        var options = new EnumerationOptions
        {
            RecurseSubdirectories = true,
            IgnoreInaccessible = true,
            AttributesToSkip = FileAttributes.ReparsePoint,
            MaxRecursionDepth = 32
        };
        var files = new List<BackupFileDto>();
        var truncated = false;

        foreach (var filePath in Directory.EnumerateFiles(root, "*", options))
        {
            if (files.Count == MaximumFiles)
            {
                truncated = true;
                break;
            }

            try
            {
                var info = new FileInfo(filePath);
                var relativePath = Path.GetRelativePath(root, filePath);
                files.Add(new BackupFileDto(
                    relativePath,
                    relativePath,
                    info.Name,
                    Path.GetExtension(info.Name).ToLowerInvariant(),
                    info.LastWriteTime.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    info.LastWriteTime.ToString("O", CultureInfo.InvariantCulture)));
            }
            catch (IOException)
            {
                // A backup file can rotate while the directory is being read; skip that entry.
            }
        }

        return new BackupDirectoryScanResult(files, truncated);
    }
}