/*
Katılımcı yönetimi. Participants sayfası bunu kullanıyor.
Üç endpoint:
  GET    /api/participants/trainings        — yönetebildiğim eğitimler (seçici için)
  GET    /api/participants/{trainingId}     — o eğitimin katılımcıları
  DELETE /api/participants/{applicationId}  — bir kişiyi listeden çıkar

Yetki kuralı: HRManager tüm eğitimlerde, Instructor sadece kendi
açtıklarında. Employee bu endpoint'lere hiç erişemiyor.
*/
using EgitimPortali.Api.Data;
using EgitimPortali.Api.DTOs.Participant;
using EgitimPortali.Api.Helpers;
using EgitimPortali.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EgitimPortali.Api.Controllers;

[ApiController]
[Route("api/participants")]
[Authorize(Roles = "Instructor,HRManager")]
public class ParticipantsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ParticipantsController(ApplicationDbContext context)
    {
        _context = context;
    }

    /*
    İsteği gönderenin kimliği. Üç endpoint'te de lazım olduğu için
    ayrı bir metotta. Token bozuksa Guid.Empty dönüyor — hiçbir
    eğitimin sahibi Guid.Empty olmadığı için yetki kontrolünden geçemez.
    */
    private Guid CurrentUserId()
    {
        var text = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(text, out var id) ? id : Guid.Empty;
    }

    // Bu kişi bu eğitimi yönetebilir mi? HR her zaman, Instructor kendi eğitiminde.
    private bool CanManage(Training training)
    {
        return User.IsInRole("HRManager") || training.InstructorUserId == CurrentUserId();
    }

    // GET /api/participants/trainings
    [HttpGet("trainings")]
    public async Task<ActionResult<List<ManagedTrainingDto>>> GetManagedTrainings()
    {
        var query = _context.Trainings.AsQueryable();

        // Instructor sadece kendi açtıklarını görüyor. HR için filtre yok.
        if (!User.IsInRole("HRManager"))
        {
            var userId = CurrentUserId();
            query = query.Where(t => t.InstructorUserId == userId);
        }

        /*
        Geçmiş eğitimler de listede — katılım kaydı (attendance)
        aşamasında bitmiş eğitimin listesine bakmak gerekecek.
        Tarihe göre sıralı; frontend en yakın gelecek eğitimi
        otomatik seçiyor.
        */
        var trainings = await query
            .OrderBy(t => t.StartDate)
            .Select(t => new { t.Id, t.Title, t.StartDate, t.EndDate, t.Status })
            .ToListAsync();

        // Durum hesaplaması veritabanında yapılamıyor, burada yapıyoruz.
        var result = trainings.Select(t => new ManagedTrainingDto
        {
            Id = t.Id,
            Title = t.Title,
            StartDate = t.StartDate,
            Status = TrainingStatusHelper.GetDisplayStatus(t.Status, t.StartDate, t.EndDate)
        }).ToList();

        return Ok(result);
    }

    // GET /api/participants/{trainingId}
    [HttpGet("{trainingId}")]
    public async Task<ActionResult<ParticipantListDto>> GetParticipants(Guid trainingId)
    {
        // ThenInclude: başvurularla birlikte başvuranların ad, e-posta,
        // departman bilgisi de gelsin — ayrı ayrı sorgulamayalım.
        var training = await _context.Trainings
            .Include(t => t.Applications)
                .ThenInclude(a => a.User)
            .FirstOrDefaultAsync(t => t.Id == trainingId);

        if (training == null)
            return NotFound();

        if (!CanManage(training))
            return Forbid();

        var dto = new ParticipantListDto
        {
            TrainingId = training.Id,
            TrainingTitle = training.Title,
            Capacity = training.Capacity,
            // Başvuru tarihine göre sıralı: yedek listedeki sıra
            // numarası frontend'de bu sıradan hesaplanıyor.
            Participants = training.Applications
                .OrderBy(a => a.AppliedAt)
                .Select(a => new ParticipantDto
                {
                    ApplicationId = a.Id,
                    FullName = a.User?.FullName ?? string.Empty,
                    Email = a.User?.Email ?? string.Empty,
                    Department = a.User?.Department,
                    Status = a.Status.ToString(),
                    AppliedAt = a.AppliedAt
                })
                .ToList()
        };

        return Ok(dto);
    }

    // DELETE /api/participants/{applicationId}
    [HttpDelete("{applicationId}")]
    public async Task<IActionResult> RemoveParticipant(Guid applicationId)
    {
        // Eğitim de lazım: yetki kontrolü ve tarih kontrolü için.
        var application = await _context.Applications
            .Include(a => a.Training)
            .FirstOrDefaultAsync(a => a.Id == applicationId);

        if (application == null || application.Training == null)
            return NotFound();

        if (!CanManage(application.Training))
            return Forbid();

        // Zaten listede olmayan birini tekrar çıkarmanın anlamı yok.
        if (application.Status == ApplicationStatus.Cancelled ||
            application.Status == ApplicationStatus.Removed)
            return BadRequest("This person is no longer on the list.");

        /*
        Başlamış eğitimden kimse çıkarılamıyor. Katılım kaydı ve
        sertifika o listeye dayanacak; eğitim sırasında liste
        değişirse kimin gerçekten katıldığı belirsizleşir.
        */
        if (application.Training.StartDate <= DateTime.UtcNow)
            return BadRequest("You cannot remove participants after the training has started.");

        // Sadece kayıtlı biri çıkarılırsa yer açılıyor.
        // Yedekteki biri çıkarılırsa terfi gerekmiyor.
        var wasEnrolled = application.Status == ApplicationStatus.Applied;

        // Kayıt silinmiyor, Removed'a çekiliyor. Kişi kendi sayfasında
        // "çıkarıldım" görüyor ve aynı eğitime tekrar başvuramıyor.
        application.Status = ApplicationStatus.Removed;

        if (wasEnrolled)
            await WaitlistHelper.PromoteNextAsync(_context, application.TrainingId);

        await _context.SaveChangesAsync();
        return NoContent();
    }
}