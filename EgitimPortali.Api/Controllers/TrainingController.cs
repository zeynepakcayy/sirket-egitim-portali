/*
Frontend'in eğitimleri listeleyip, detayını gösterip, oluşturup,
güncelleyip, iptal edebilmesi içinbackend'de bu işlemleri yapacak
bir API katmanı gerekiyordu

Bu controller, /api/trainings altında beş endpoint sunuyor (listele, detay göster, oluştur, 
güncelle, iptal et), her isteği rol bazlı yetkiyle kontrol ediyor ve veritabanı modelini doğrudan
değil DTO'lar üzerinden dışarı veriyor.

*/
using EgitimPortali.Api.Data;
using EgitimPortali.Api.DTOs.Training;
using EgitimPortali.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

using EgitimPortali.Api.DTOs.Common;

namespace EgitimPortali.Api.Controllers;

[ApiController]
[Route("api/trainings")]
[Authorize] // controller'daki tüm endpoint'ler en az "giriş yapmış olma" ister
public class TrainingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public TrainingsController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET /api/trainings?page=1&pageSize=10
    // Eğitimleri sayfa sayfa döndürür; her istekte veritabanından sadece istenen sayfa çekilir.
    // Neden: Tüm eğitimleri tek seferde çekmek, kayıt sayısı arttıkça veritabanını ve ağı yorar.
    [HttpGet]
    public async Task<ActionResult<PagedResult<TrainingListDto>>> GetTrainings(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        // Mantıksız değerleri düzeltiyoruz (ör. page=0 ya da pageSize=100000)
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;
        if (pageSize > 50) pageSize = 50;

        //henüz veritabanına gidilmiyor, sadece sorgu tarif ediliyor.
        //sırasız sayfalamada aynı kayıt iki sayfada birden çıkabilir.
        var query = _context.Trainings
            .OrderBy(t => t.StartDate)
            .ThenBy(t => t.Id);

        // 1. sorgu: toplam kayıt sayısı (sayfaya bölmeden ÖNCE sayılmalı)
        var totalCount = await query.CountAsync();

        // 2. sorgu: sadece istenen sayfanın kayıtları
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TrainingListDto
            {
                Id = t.Id,
                Title = t.Title,
                //"?." kullanılamaz, veritabanı sorgusu içinde derleme hatası verir
                InstructorName = t.Instructor != null ? t.Instructor.FullName : string.Empty,
                StartDate = t.StartDate,
                EndDate = t.EndDate,
                Location = t.Location,
                Category = t.Category,
                Capacity = t.Capacity,
                // Sayımı artık veritabanı yapıyor, başvurular hafızaya çekilmiyor
                EnrolledCount = t.Applications.Count(a => a.ApprovalStatus == ApprovalStatus.Approved),
                Status = t.Status.ToString()
            })
            .ToListAsync();

        var result = new PagedResult<TrainingListDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };

        return Ok(result);
    }

    // GET /api/trainings/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<TrainingDetailDto>> GetTraining(Guid id)
    {
        var training = await _context.Trainings
            .Include(t => t.Instructor)
            .Include(t => t.Applications)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (training == null)
            return NotFound();

        var dto = new TrainingDetailDto
        {
            Id = training.Id,
            Title = training.Title,
            Description = training.Description,
            InstructorName = training.Instructor?.FullName ?? string.Empty,
            StartDate = training.StartDate,
            EndDate = training.EndDate,
            Location = training.Location,
            Category = training.Category,
            Capacity = training.Capacity,
            EnrolledCount = training.Applications.Count(a => a.ApprovalStatus == ApprovalStatus.Approved),
            Status = training.Status.ToString()
        };

        return Ok(dto);
    }

    // POST /api/trainings
    [HttpPost]
    [Authorize(Roles = "Instructor,HRManager")]
    public async Task<IActionResult> CreateTraining(CreateTrainingDto dto)
    {
        // Eğitmenin kim olduğunu istemciden ALMIYORUZ, token'dan okuyoruz.
        // Neden: Yoksa biri "ben Ahmet adına eğitim açıyorum" diye sahte ID gönderebilirdi.
        var instructorIdText = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (instructorIdText == null || !Guid.TryParse(instructorIdText, out var instructorId))
            return Unauthorized();

        var training = new Training
        {
            Id = Guid.NewGuid(),
            InstructorUserId = instructorId,
            Title = dto.Title,
            Description = dto.Description,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Location = dto.Location,
            Category = dto.Category,
            Capacity = dto.Capacity,
            Status = TrainingStatus.Planned
        };

        _context.Trainings.Add(training);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTraining), new { id = training.Id }, training.Id);
    }

    // PUT /api/trainings/{id}
    // Var olan bir eğitimi günceller (Status dahil). Instructor ve HRManager çağırabilir.
    // Neden: Eğitim bilgileri değişebilir, durumu (Planned->Completed gibi) de değişebilir.
    [HttpPut("{id}")]
    [Authorize(Roles = "Instructor,HRManager")]
    public async Task<IActionResult> UpdateTraining(Guid id, UpdateTrainingDto dto)
    {
        var training = await _context.Trainings.FindAsync(id);
        if (training == null)
            return NotFound();

        // İstemciden gelen "Completed" gibi bir metni enum değerine çeviriyoruz.
        // Geçersiz bir metin gelirse (yazım hatası vs.) uygulama çökmesin, 400 dönsün diye TryParse kullanıyoruz.
    
        if (!Enum.TryParse<TrainingStatus>(dto.Status, out var parsedStatus))
            return BadRequest("Invalid status value.");

        training.Title = dto.Title;
        training.Description = dto.Description;
        training.StartDate = dto.StartDate;
        training.EndDate = dto.EndDate;
        training.Location = dto.Location;
        training.Category = dto.Category;
        training.Capacity = dto.Capacity;
        training.Status = parsedStatus;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE /api/trainings/{id}
    // Eğitimi GERÇEKTEN silmez, sadece Status'u "Cancelled" yapar (soft delete).
    // Neden: Silinen eğitime bağlı başvuru geçmişi kaybolmasın, kullanıcılar eğitimi "iptal edilmiş" olarak görsün.
    // Sadece HRManager çağırabilir.
    [HttpDelete("{id}")]
    [Authorize(Roles = "HRManager")]
    public async Task<IActionResult> DeleteTraining(Guid id)
    {
        var training = await _context.Trainings.FindAsync(id);
        if (training == null)
            return NotFound();

        training.Status = TrainingStatus.Cancelled;
        await _context.SaveChangesAsync();

        return NoContent();
    }
}