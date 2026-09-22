/*
Başvuru işlemleri. Üç endpoint:
  POST   /api/applications/{trainingId}  — başvur
  DELETE /api/applications/{trainingId}  — başvuruyu geri çek
  GET    /api/applications/my            — kendi başvurularım

Onay akışı yok: başvuran anında kaydolur, kontenjan doluysa
yedek listeye düşer. HRManager bu endpoint'lere hiç erişemiyor —
tamamen yönetici rolü, eğitime katılmıyor.

İki bildirim üretiyor: başvuru olunca eğitimi açan kişiye,
biri çekilip yedekten terfi olunca terfi eden kişiye.
*/
using EgitimPortali.Api.Data;
using EgitimPortali.Api.DTOs.Application;
using EgitimPortali.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using EgitimPortali.Api.Helpers;
using EgitimPortali.Api.Services;

namespace EgitimPortali.Api.Controllers;

[ApiController]
[Route("api/applications")]
[Authorize(Roles = "Employee,Instructor")]
public class ApplicationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    // Bildirim üreten servis. Program.cs'de AddScoped ile tanıtıldı.
    private readonly NotificationService _notifications;

    public ApplicationsController(
        ApplicationDbContext context,
        NotificationService notifications)
    {
        _context = context;
        _notifications = notifications;
    }

    // POST /api/applications/{trainingId}
    [HttpPost("{trainingId}")]
    public async Task<IActionResult> Apply(Guid trainingId)
    {
        var userIdText = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdText == null || !Guid.TryParse(userIdText, out var userId))
            return Unauthorized();

        // Başvuruları da çekiyoruz: kontenjan sayımı ve
        // "bu kişi zaten başvurmuş mu" kontrolü için gerekli.
        var training = await _context.Trainings
            .Include(t => t.Applications)
            .FirstOrDefaultAsync(t => t.Id == trainingId);

        if (training == null)
            return NotFound();

        if (training.Status == TrainingStatus.Cancelled)
            return BadRequest("This training has been cancelled.");

        // Başlamış eğitime başvurulamaz. Katalog zaten sadece
        // gelecek tarihlileri listeliyor ama istek elle gönderilebilir.
        if (training.StartDate <= DateTime.UtcNow)
            return BadRequest("This training has already started.");

        // Eğitimi açan kişi kendi eğitimine başvuramaz.
        if (training.InstructorUserId == userId)
            return BadRequest("You cannot apply to your own training.");


        var existing = training.Applications.FirstOrDefault(a => a.UserId == userId);

        // Listeden çıkarılan kişi tekrar başvuramaz — yoksa çıkarmanın
        // anlamı kalmazdı. Bu kontrol aşağıdakinden ÖNCE olmalı:
        // sonra olsaydı kişi yanlışlıkla "zaten başvurdun" mesajı görürdü.
        if (existing != null && existing.Status == ApplicationStatus.Removed)
            return BadRequest("You were removed from this training by the organizer.");

        if (existing != null && existing.Status != ApplicationStatus.Cancelled)
            return BadRequest("You have already applied to this training.");
        
        
        /*
        Kontenjan kontrolü. Sadece Applied olanlar sayılıyor —
        yedektekiler yer kaplamıyor, vazgeçenler zaten çıkmış.
        Dolu ise kişi yedek listeye düşüyor, başvurusu reddedilmiyor.
        */
        var enrolledCount = training.Applications.Count(a => a.Status == ApplicationStatus.Applied);
        var newStatus = enrolledCount >= training.Capacity
            ? ApplicationStatus.Waitlisted
            : ApplicationStatus.Applied;

        if (existing != null)
        {
            /*
            Daha önce başvurup vazgeçmiş. Yeni kayıt açmak yerine
            eskisini güncelliyoruz — "bir kişinin bir eğitimde bir
            kaydı olur" kuralı korunsun diye.

            AppliedAt yenileniyor: yedek listede sıra bu tarihe göre
            belirleniyor, vazgeçip dönen kişi eski sırasını korumamalı.
            */
            existing.Status = newStatus;
            existing.AppliedAt = DateTime.UtcNow;
        }
        else
        {
            _context.Applications.Add(new Models.Application
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                TrainingId = trainingId,
                Status = newStatus,
                AppliedAt = DateTime.UtcNow
            });
        }

        /*
        Eğitimi açan kişiye haber: eğitimine biri başvurdu.
        Yedeğe düşen başvurular da bildiriliyor — eğitmen için
        ikisi de "eğitimimde hareket var" demek.

        SaveChangesAsync'ten ÖNCE hazırlanıyor: başvuru kaydıyla
        birlikte tek seferde yazılıyor.
        */
        await _notifications.NewApplicationAsync(training, userId);

        await _context.SaveChangesAsync();

        // Frontend hangi duruma düştüğünü bilmeli:
        // "Applied" mi yoksa "Waitlisted" mı diye mesaj gösterecek.
        return Ok(new { status = newStatus.ToString() });
    }

    // DELETE /api/applications/{trainingId}
    [HttpDelete("{trainingId}")]
    public async Task<IActionResult> Withdraw(Guid trainingId)
    {
        var userIdText = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdText == null || !Guid.TryParse(userIdText, out var userId))
            return Unauthorized();

        /*
        Include eklendi: terfi bildiriminin cümlesinde eğitimin
        başlığı geçiyor, o yüzden eğitim nesnesi lazım.
        Önceden sadece başvuru kaydıyla iş görüyordu.
        */
        var application = await _context.Applications
            .Include(a => a.Training)
            .FirstOrDefaultAsync(a => a.TrainingId == trainingId && a.UserId == userId);

        if (application == null || application.Training == null)
            return NotFound();

        
        // Çıkarılmış kişinin geri çekecek bir kaydı yok. Bu kontrol
        // olmasaydı durumu Removed'dan Cancelled'a çevrilir, "çıkarıldı"
        // bilgisi kaybolur ve kişi tekrar başvurabilir hale gelirdi.
        if (application.Status == ApplicationStatus.Removed)
            return BadRequest("You were removed from this training by the organizer.");
        
        
        // Yer açılıyor mu, yoksa yedekteki biri mi çıkıyor?
        // Sadece kayıtlı biri çıkarsa yedekten terfi gerekiyor.
        var wasEnrolled = application.Status == ApplicationStatus.Applied;

        // Kayıt silinmiyor, Cancelled'a çekiliyor. Katılımcı
        // listesinde "vazgeçti" olarak görünmeli.
        application.Status = ApplicationStatus.Cancelled;

        // Kayıtlı biri ayrıldıysa yedekteki en eski başvuran yukarı çıkıyor.
        // Mantık WaitlistHelper'da — Participants'taki çıkarma da aynısını kullanıyor.
        if (wasEnrolled)
        {
            var promoted = await WaitlistHelper.PromoteNextAsync(_context, trainingId);

            // Yedek listede kimse yoksa null dönüyor, bildirim de gitmiyor.
            if (promoted != null)
                _notifications.PromotedFromWaitlist(promoted.UserId, application.Training);
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/applications/my
    // My Trainings sayfası. Vazgeçilenler de dönüyor —
    // kullanıcı geçmişini görebilsin diye.
    [HttpGet("my")]
    public async Task<ActionResult<List<ApplicationListDto>>> GetMyApplications()
    {
        var userIdText = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdText == null || !Guid.TryParse(userIdText, out var userId))
            return Unauthorized();

        var items = await _context.Applications
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.Training!.StartDate)
            .Select(a => new ApplicationListDto
            {
                Id = a.Id,
                TrainingId = a.TrainingId,
                TrainingTitle = a.Training!.Title,
                Category = a.Training.Category,
                // Katalogdaki kuralın aynısı: dış eğitmen varsa onun adı.
                InstructorName = !string.IsNullOrEmpty(a.Training.ExternalInstructorName)
                    ? a.Training.ExternalInstructorName
                    : (a.Training.Instructor != null ? a.Training.Instructor.FullName : string.Empty),
                StartDate = a.Training.StartDate,
                EndDate = a.Training.EndDate,
                Location = a.Training.Location,
                Status = a.Status.ToString(),
                AppliedAt = a.AppliedAt,
                // Ham değer; görünen durum aşağıda hesaplanıyor.
                TrainingStatus = a.Training.Status.ToString(),
                TrainingStatusRaw = a.Training.Status
            })
            .ToListAsync();

            
            // Select veritabanında çalıştığı için hesaplamayı burada yapıyoruz.
            // Katalogdaki GetTrainings ile aynı yöntem.
            foreach (var item in items)
            {
                item.TrainingStatus = TrainingStatusHelper.GetDisplayStatus(
                    item.TrainingStatusRaw, item.StartDate, item.EndDate);
            }

        return Ok(items);
    }
}