using Service.Contracts.Requests;
using Service.Contracts.Responses;

namespace Service.BackupMonitoring;

public interface IBackupSettingsService
{
    Task<BackupSettingsResponse> GetBackupSettingsAsync(CancellationToken cancellationToken);
    Task ReplaceBackupSettingsAsync(ReplaceBackupSettingsRequest request, CancellationToken cancellationToken);
}
