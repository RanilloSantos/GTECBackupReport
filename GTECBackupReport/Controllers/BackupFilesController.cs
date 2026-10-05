using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Service.BackupMonitoring;
using Service.Contracts.Requests;

namespace GTECBackupReport.Controllers;

[ApiController]
[Authorize]
[Route("api/backup-files")]
public sealed class BackupFilesController(IBackupDirectoryScanner scanner) : ControllerBase
{
    [HttpPost("scan")]
    [Consumes("application/json")]
    public IActionResult Scan([FromBody] ScanDirectoryRequest request)
    {
        try
        {
            return Ok(scanner.Scan(request.DirectoryPath));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (DirectoryNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "The web server account cannot read this directory." });
        }
        catch (IOException)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "The directory could not be scanned." });
        }
    }
}