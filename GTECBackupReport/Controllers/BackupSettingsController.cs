using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Service.BackupMonitoring;
using Service.Contracts.Requests;

namespace GTECBackupReport.Controllers;

[ApiController]
[Route("api/backup-settings")]
public sealed class BackupSettingsController(IBackupSettingsService service, ILogger<BackupSettingsController> logger) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        try
        {
            var settings = await service.GetBackupSettingsAsync(cancellationToken);
            if (User.Identity?.IsAuthenticated != true)
            {
                settings.TargetDirectory = string.Empty;
                foreach (var source in settings.Sources)
                {
                    source.Patterns = string.Empty;
                    source.Folder = string.Empty;
                }
            }
            return Ok(settings);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogError(exception, "Could not load backup settings. Trace ID: {TraceId}", HttpContext.TraceIdentifier);
            return Problem(
                detail: $"{exception.Message} (Trace ID: {HttpContext.TraceIdentifier})",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Could not load backup settings");
        }
    }

    [HttpPut]
    [Authorize]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Replace([FromBody] ReplaceBackupSettingsRequest request, CancellationToken cancellationToken)
    {
        try
        {
            await service.ReplaceBackupSettingsAsync(request, cancellationToken);
            return NoContent();
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogError(exception, "Could not save backup settings. Trace ID: {TraceId}", HttpContext.TraceIdentifier);
            return Problem(
                detail: $"{exception.Message} (Trace ID: {HttpContext.TraceIdentifier})",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Could not save backup settings");
        }
    }
}
