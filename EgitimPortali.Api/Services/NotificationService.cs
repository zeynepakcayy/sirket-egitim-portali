using EgitimPortali.Api.Data;
using EgitimPortali.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EgitimPortali.Api.Services;

/*
Bildirim üreten tek merkez. Hangi olayda kime ne yazılacağı
sadece burada tanımlı; controller'lar cümle kurmuyor.

ÖNEMLİ: Bu sınıf SaveChangesAsync() ÇAĞIRMIYOR.
Bildirimleri hafızada hazırlıyor, kaydetmeyi çağıran controller yapıyor.
Böylece asıl işlem (iptal, çıkarma, terfi) ile bildirim tek seferde
kaydediliyor: ya ikisi de olur, ya hiçbiri.
WaitlistHelper'da da aynı yol izlenmişti.
*/
public class NotificationService
{
    private readonly ApplicationDbContext _context;

    // Veritabanındaki tarihler UTC. Kullanıcıya doğrudan yazsaydık
    // saat 09:30 olan eğitim için "06:30" derdik. Bu dönüştürücü onu engelliyor.
    private static readonly TimeZoneInfo TurkeyTimeZone =
        TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");

    public NotificationService(ApplicationDbContext context)
    {
        _context = context;
    }


    // ---------------- özel yardımcılar ----------------

    // Tek bir bildirim satırı hazırlar. Diske YAZMIYOR, sadece sıraya koyuyor.
    private void Add(Guid userId, NotificationType type, string message, Guid? trainingId)
    {
        _context.Notifications.Add(new Notification
        {
            UserId = userId,
            Type = type,
            Message = message,
            TrainingId = trainingId
            // Id ve CreatedAt kendiliğinden doluyor
        });
    }

    // Eğitimin AKTİF katılımcıları: kayıtlı olanlar + yedektekiler.
    // Çekilenler (Cancelled) ve çıkarılanlar (Removed) dışarıda kalıyor —
    // artık o eğitimle ilgileri yok, bildirim göndermek rahatsız edici olur.
    private async Task<List<Guid>> GetActiveParticipantIdsAsync(Guid trainingId)
    {
        return await _context.Applications
            .Where(a => a.TrainingId == trainingId &&
                       (a.Status == ApplicationStatus.Applied ||
                        a.Status == ApplicationStatus.Waitlisted))
            .Select(a => a.UserId)
            .ToListAsync();
    }

    // UTC saati Türkiye saatine çevirip "09:30" biçiminde döndürür.
    private static string LocalTimeText(DateTime utcDate)
    {
        var local = TimeZoneInfo.ConvertTimeFromUtc(utcDate, TurkeyTimeZone);
        return local.ToString("HH:mm");
    }


    // ---------------- olaylar ----------------

    // Eğitimin tarihi, saati veya konumu değişti.
    // Hangi değişikliğin "güncelleme" sayılacağına controller karar veriyor;
    // buraya gelindiyse zaten bildirim gönderilecek demektir.
    public async Task TrainingUpdatedAsync(Training training)
    {
        var userIds = await GetActiveParticipantIdsAsync(training.Id);
        var message = $"{training.Title} has been updated. Please check the new date, time or location.";

        foreach (var userId in userIds)
        {
            Add(userId, NotificationType.TrainingUpdated, message, training.Id);
        }
    }

    // Eğitim iptal edildi.
    public async Task TrainingCancelledAsync(Training training)
    {
        var userIds = await GetActiveParticipantIdsAsync(training.Id);
        var message = $"{training.Title} has been cancelled.";

        foreach (var userId in userIds)
        {
            Add(userId, NotificationType.TrainingCancelled, message, training.Id);
        }
    }

    // Yedek listedeki kişi asıl listeye geçti.
    // Kimin terfi ettiğini WaitlistHelper zaten biliyor, sorgu gerekmiyor —
    // bu yüzden metot async değil.
    public void PromotedFromWaitlist(Guid userId, Training training)
    {
        Add(userId,
            NotificationType.PromotedFromWaitlist,
            $"You are now registered for {training.Title}. A place became available.",
            training.Id);
    }

    // Eğitmen ya da HR kişiyi listeden çıkardı.
    public void RemovedFromTraining(Guid userId, Training training)
    {
        Add(userId,
            NotificationType.RemovedFromTraining,
            $"You have been removed from {training.Title} by the organizer.",
            training.Id);
    }

    // Eğitimi açan kişiye: eğitimine biri başvurdu.
    // Başvuranın adını burada çekiyoruz; controller'ın ayrıca sorgu
    // yapmasına gerek kalmıyor.
    public async Task NewApplicationAsync(Training training, Guid applicantUserId)
    {
        var applicantName = await _context.Users
            .Where(u => u.Id == applicantUserId)
            .Select(u => u.FullName)
            .FirstOrDefaultAsync();

        // Ad bulunamazsa bildirim yine gitsin — eksik bilgi, bildirimin
        // hiç gitmemesinden iyidir.
        var displayName = string.IsNullOrWhiteSpace(applicantName) ? "Someone" : applicantName;

        Add(training.InstructorUserId,
            NotificationType.NewApplication,
            $"{displayName} applied to {training.Title}.",
            training.Id);
    }

    // Eğitim yarın başlıyor. (9. adımda günlük çalışan görev bunu çağıracak.)
    // Sadece KAYITLI olanlara gidiyor — yedekteki kişi eğitime katılmayacak,
    // ona "yarın başlıyor" demek yanıltıcı olur.
    public async Task TrainingReminderAsync(Training training)
    {
        var userIds = await _context.Applications
            .Where(a => a.TrainingId == training.Id &&
                        a.Status == ApplicationStatus.Applied)
            .Select(a => a.UserId)
            .ToListAsync();

        var message = $"{training.Title} starts tomorrow at {LocalTimeText(training.StartDate)}.";

        foreach (var userId in userIds)
        {
            Add(userId, NotificationType.TrainingReminder, message, training.Id);
        }
    }

    // Sertifika hazır. (6. Aşama'da kullanılacak.)
    public void CertificateReady(Guid userId, Training training)
    {
        Add(userId,
            NotificationType.CertificateReady,
            $"Your certificate for {training.Title} is ready.",
            training.Id);
    }

    // Yeni eğitim daveti. (8. adımda form üzerinden seçilen kişilere gidecek.)
    // Herkese gönderilmiyor — eğitimi açan kişi listeyi kendi seçiyor.
    public void NewTrainingInvite(List<Guid> userIds, Training training)
    {
        var message = $"You have been invited to {training.Title}.";

        foreach (var userId in userIds)
        {
            Add(userId, NotificationType.NewTrainingInvite, message, training.Id);
        }
    }
}