using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EgitimPortali.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{
    [HttpGet("herkese-acik")]
    public IActionResult HerkeseAcik()
    {
        return Ok(new { message = "Bu endpoint herkese açık." });
    }

    [HttpGet("giris-gerekli")]
    [Authorize]
    public IActionResult GirisGerekli()
    {
        return Ok(new { message = "Token geçerli, içeri girdin." });
    }

    [HttpGet("sadece-ik")]
    [Authorize(Roles = "HRManager")]
    public IActionResult SadeceIk()
    {
        return Ok(new { message = "Sen İK Yöneticisisin." });
    }
}