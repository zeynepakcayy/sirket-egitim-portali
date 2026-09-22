/*
Kullanıcı listesi. Şimdilik tek endpoint:
  GET /api/users/invitable — yeni eğitime davet edilebilecek kişiler

Sadece Instructor ve HRManager erişebiliyor: bu endpoint bütün
çalışanların adını döndürüyor, Employee rolündeki birinin şirket
rehberini çekmesine gerek yok.
*/
using EgitimPortali.Api.Data;
using EgitimPortali.Api.DTOs.User;
using EgitimPortali.Api.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EgitimPortali.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Instructor,HRManager")]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public UsersController(ApplicationDbContext context)
    {
        _context = context;
    }

    private Guid CurrentUserId()
    {
        var text = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(text, out var id) ? id : Guid.Empty;
    }

    // GET /api/users/invitable
    [HttpGet("invitable")]
    public async Task<ActionResult<List<InvitableUserDto>>> GetInvitableUsers()
    {
        // Kim davet edilebilir kuralı ortak yardımcıda.
        var ids = await InvitableUserHelper.GetIdsAsync(_context, CurrentUserId());

        var result = await _context.Users
            .Where(u => ids.Contains(u.Id))
            // Alfabetik: kullanıcı aradığı kişiyi göz taramasıyla bulabilsin.
            .OrderBy(u => u.FullName)
            .Select(u => new InvitableUserDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Department = u.Department
            })
            .ToListAsync();

        return Ok(result);
    }
}