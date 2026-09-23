using EgitimPortali.Api.Data;
using EgitimPortali.Api.DTOs.MyTraining;
using EgitimPortali.Api.Helpers;
using EgitimPortali.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EgitimPortali.Api.Controllers;

/*
"Benim actigim egitimler" sayfasinin verisi.

Employee'ye kapali: bu sayfa egitim yonetme sayfasi, Employee
egitim acamiyor. Instructor sadece kendi actiklarini, HRManager
hepsini goruyor.
*/
[ApiController]
[Route("api/my-trainings")]
[Authorize(Roles = "Instructor,HRManager")]
public class MyTrainingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public MyTrainingsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<MyTrainingsResponseDto>> GetMyTrainings()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var isHrManager = User.IsInRole("HRManager");

        // 1) Hangi egitimler? HR hepsini, egitmen kendininkini.
        var query = _context.Trainings.AsQueryable();

        if (!isHrManager)
            query = query.Where(t => t.InstructorUserId == userId);

        var trainings = await query
            .OrderByDescending(t => t.StartDate)
            .Select(t => new
            {
                t.Id,
                t.Title,
                t.Category,
                t.StartDate,
                t.EndDate,
                t.Location,
                t.Capacity,
                t.Status,
                t.InstructorUserId
            })
            .ToListAsync();

        if (trainings.Count == 0)
            return Ok(new MyTrainingsResponseDto());

        var trainingIds = trainings.Select(t => t.Id).ToList();

        // 2) Basvuru sayilari. Her egitim icin ayri sorgu atmak yerine
        //    hepsini tek sorguda, veritabaninda gruplayarak aliyoruz.
        //    20 egitim = 1 sorgu, 41 degil.
        var counts = await _context.Applications
            .Where(a => trainingIds.Contains(a.TrainingId))
            .GroupBy(a => new { a.TrainingId, a.Status })
            .Select(g => new { g.Key.TrainingId, g.Key.Status, Count = g.Count() })
            .ToListAsync();

        var countMap = counts.ToDictionary(c => (c.TrainingId, c.Status), c => c.Count);

        int CountOf(Guid trainingId, ApplicationStatus status) =>
            countMap.TryGetValue((trainingId, status), out var n) ? n : 0;

        // 3) Organizator isimleri. HR ekraninda "kim acti" sutunu var.
        var organizerIds = trainings.Select(t => t.InstructorUserId).Distinct().ToList();

        var organizerMap = await _context.Users
            .Where(u => organizerIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName })
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        // 4) Birlestirme. TrainingStatusHelper bir C# metodu, SQL'e
        //    cevrilemez - bu yuzden veriler bellege geldikten sonra calisiyor.
        var items = trainings.Select(t => new MyTrainingItemDto
        {
            Id = t.Id,
            Title = t.Title,
            Category = t.Category,
            StartDate = t.StartDate,
            EndDate = t.EndDate,
            Location = t.Location,
            Capacity = t.Capacity,
            Status = TrainingStatusHelper.GetDisplayStatus(t.Status, t.StartDate, t.EndDate),
            OrganizerName = organizerMap.TryGetValue(t.InstructorUserId, out var name) ? name : "-",
            IsMine = t.InstructorUserId == userId,
            RegisteredCount = CountOf(t.Id, ApplicationStatus.Applied),
            WaitlistCount = CountOf(t.Id, ApplicationStatus.Waitlisted),
            WithdrawnCount = CountOf(t.Id, ApplicationStatus.Cancelled),
            RemovedCount = CountOf(t.Id, ApplicationStatus.Removed)
        }).ToList();

        // 5) Kutular. Listeden toplaniyor - ayri sorgu atsaydik
        //    ayni sayiyi iki kere hesaplamis olurduk.
        var summary = new MyTrainingSummaryDto
        {
            TrainingCount = items.Count,
            Registered = items.Sum(i => i.RegisteredCount),
            Waitlisted = items.Sum(i => i.WaitlistCount),
            Withdrawn = items.Sum(i => i.WithdrawnCount),
            Removed = items.Sum(i => i.RemovedCount),
            CancelledTrainings = items.Count(i => i.Status == TrainingStatus.Cancelled.ToString())
        };

        return Ok(new MyTrainingsResponseDto { Summary = summary, Items = items });
    }
}