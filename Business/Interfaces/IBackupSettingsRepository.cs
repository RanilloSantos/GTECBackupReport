using Business.Models;

namespace Business.Interfaces;

public interface IBackupSettingsRepository
{
    Task<BackupSettings> GetBackupSettingsAsync(CancellationToken cancellationToken);
    Task ReplaceBackupSettingsAsync(BackupSettings settings, CancellationToken cancellationToken);
    Task<BackupFilterDefaults> GetUserFilterDefaultsAsync(string userId, CancellationToken cancellationToken);
    Task ReplaceUserFilterDefaultsAsync(string userId, BackupFilterDefaults defaults, CancellationToken cancellationToken);
}
