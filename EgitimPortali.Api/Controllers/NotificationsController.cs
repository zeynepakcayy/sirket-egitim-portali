/*
Bildirim okuma. Zil ikonu bunu kullanıyor.
Dört endpoint:
  GET /api/notifications/unread-count   — okunmamış sayısı (30 sn'de bir sorulan hafif istek)
  GET /api/notifications                — son 20 bildirim
  PUT /api/notifications/{id}/read      — tek bildirimi okundu yap
  PUT /api/notifications/read-all       — hepsini okundu yap

Rol kısıtı YOK, sadece giriş şartı var: üç rol de bildirim alıyor.
HR eğitime başvuramıyor ama kendi eğitimine biri başvurunca bildirim alıyor.

Güvenlik: her sorgu giriş yapan kişinin kimliğiyle süzülüyor.
Kimse başkasının bildirimini göremiyor ya da okundu yapamıyor.
*/
using EgitimPortali.Api.Data;
using EgitimPortali.Api.DTOs.Notification;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EgitimPortali.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    // Zil açılır listesinde kaç bildirim gösterilecek.
    // Tek yerde duruyor ki değiştirmek gerekince tek satır değişsin.
    private const int ListSize = 20;

    public NotificationsController(ApplicationDbContext context)
    {
        _context = context;
    }

    /*
    İsteği gönderenin kimliği. ParticipantsController'daki ile birebir aynı.
    Token bozuksa Guid.Empty dönüyor — hiçbir bildirimin sahibi
    Guid.Empty olmadığı için sorgular boş sonuç veriyor, kimse
    yanlışlıkla başkasının verisini görmüyor.
    */
    private Guid CurrentUserId()
    {
        var text = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(text, out var id) ? id : Guid.Empty;
    }


    // GET /api/notifications/unread-count
    /*
    30 saniyede bir çağrılacak olan endpoint bu. Bilerek çok hafif:
    tek bir sayı dönüyor, hiçbir metin taşınmıyor.
    CountAsync veritabanında sayıyor — satırlar buraya hiç gelmiyor.
    */
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = CurrentUserId();

        var count = await _context.Notifications
            .CountAsync(n => n.UserId == userId && !n.IsRead);

        return Ok(new { count });
    }


    // GET /api/notifications
    /*
    Zile tıklanınca çağrılıyor. Son 20 bildirim, yeniden eskiye.
    Eski bildirimler veritabanında duruyor, sadece listede görünmüyorlar.
    */
    [HttpGet]
    public async Task<ActionResult<List<NotificationDto>>> GetNotifications()
    {
        var userId = CurrentUserId();

        /*
        Önce ham satırları çekiyoruz. Type alanını burada metne
        çevirmiyoruz çünkü bu sorgu SQL'e dönüşüyor ve SQL C#
        metodu çalıştıramıyor — GetDisplayStatus'ta yaşadığımızın aynısı.
        */
        var rows = await _context.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(ListSize)
            .Select(n => new
            {
                n.Id,
                n.Type,
                n.Message,
                n.TrainingId,
                n.IsRead,
                n.CreatedAt
            })
            .ToListAsync();

        // Satırlar artık bellekte. Metne çevirmeyi burada yapabiliyoruz.
        var result = rows.Select(n => new NotificationDto
        {
            Id = n.Id,
            Type = n.Type.ToString(),
            Message = n.Message,
            TrainingId = n.TrainingId,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt
        }).ToList();

        return Ok(result);
    }


    // PUT /api/notifications/{id}/read
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var userId = CurrentUserId();

        /*
        İki şart birden: bildirim bu kimlikte olacak VE bu kişiye ait olacak.
        İkinci şart olmasaydı adres çubuğuna başka bir kimlik yazan kişi
        başkasının bildirimini okundu yapabilirdi.
        */
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        /*
        Başkasının bildirimi de buraya düşüyor ve NotFound alıyor.
        Bilerek NotFound: Forbid() deseydik "böyle bir bildirim var
        ama senin değil" bilgisini sızdırmış olurduk.
        */
        if (notification == null)
            return NotFound();

        // Zaten okunmuşsa veritabanına boşuna yazmıyoruz.
        if (!notification.IsRead)
        {
            notification.IsRead = true;
            await _context.SaveChangesAsync();
        }

        return NoContent();
    }


    // PUT /api/notifications/read-all
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = CurrentUserId();

        // Sadece okunmamışları çekiyoruz — okunmuşları tekrar
        // işaretlemenin anlamı yok.
        var unread = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var notification in unread)
        {
            notification.IsRead = true;
        }

        // Hiç okunmamış yoksa bile zararsız — kaydedilecek değişiklik yok.
        await _context.SaveChangesAsync();

        return NoContent();
    }
}