using Business.Models;

namespace Business.Interfaces;

public interface IBackupSettingsRepository
{
    Task<BackupSettings> GetBackupSettingsAsync(CancellationToken cancellationToken);
    Task ReplaceBackupSettingsAsync(BackupSettings settings, CancellationToken cancellationToken);
}
