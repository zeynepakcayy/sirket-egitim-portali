using EgitimPortali.Api.Data;
using EgitimPortali.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EgitimPortali.Api.Services;

/*
"Eğitimin yarın başlıyor" hatırlatmalarını üreten arka plan görevi.

Diğer bildirimlerden farkı: bunu kimse tetiklemiyor, zamanın kendisi
tetikliyor. Kullanıcı bir şey yapmasa da çalışması gerekiyor, o yüzden
bir isteğe bağlı olamaz — BackgroundService olarak uygulama boyunca
arka planda duruyor.

Üç karar:
  1. SAATTE BİR kontrol ediyor, günde bir kez değil. Sunucu belirli
     bir saatte kapalıysa o günün hatırlatmaları hiç gitmezdi;
     böyle açılınca kendini toparlıyor.
  2. Aynı hatırlatmanın iki kez gitmesini bildirim tablosuna bakarak
     engelliyor. Training tablosuna "gönderildi" kolonu eklemeye
     gerek yok — bildirim kaydı zaten kendi günlüğü.
  3. Sadece 08:00–22:00 arasında bildirim üretiyor. Gece yarısı
     bildirim (ve ileride e-posta) göndermek istemiyoruz.
*/
public class TrainingReminderService : BackgroundService
{
    /*
    DbContext'i doğrudan enjekte EDEMİYORUZ.

    BackgroundService uygulama boyunca tek bir nesne olarak yaşıyor,
    ApplicationDbContext ise her istek için yeniden üretiliyor
    (AddScoped). Tek nesneye scoped bir bağımlılık verilemez —
    .NET buna izin vermiyor.

    Çözüm: fabrikayı alıyoruz ve her uyanışta kendi kapsamımızı
    açıyoruz. Kapsam iş bitince kapanıyor, bağlantı serbest kalıyor.
    */
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TrainingReminderService> _logger;

    // Tarihler veritabanında UTC. "Yarın" hesabı Türkiye takvimine
    // göre yapılmalı, yoksa gece yarısı civarı bir gün kayabilir.
    private static readonly TimeZoneInfo TurkeyTimeZone =
        TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");

    public TrainingReminderService(
        IServiceScopeFactory scopeFactory,
        ILogger<TrainingReminderService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }


    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));

        /*
        do...while: ilk tur BEKLEMEDEN çalışıyor, sonraki turlar
        saat başı. Böylece uygulama açılır açılmaz bir kontrol
        yapılıyor — sunucu kapalıyken kaçan hatırlatmalar hemen gidiyor.
        */
        do
        {
            try
            {
                await SendRemindersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                /*
                Hatayı yutup devam ediyoruz. Yakalamasaydık tek bir
                hata bütün görevi öldürürdü ve uygulama yeniden
                başlatılana kadar hiç hatırlatma gitmezdi.
                Bir sonraki saatte tekrar deniyor.
                */
                _logger.LogError(ex, "Training reminder run failed.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }


    private async Task SendRemindersAsync(CancellationToken stoppingToken)
    {
        var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TurkeyTimeZone);

        // Gece uyanıyorsa hiçbir şey yapmadan geri dönüyor.
        if (nowLocal.Hour < 8 || nowLocal.Hour >= 22)
        {
            return;
        }

        /*
        Yarının sınırları. Türkiye takviminde yarın 00:00'dan
        öbür gün 00:00'a kadar. İkisini de UTC'ye çeviriyoruz
        çünkü veritabanındaki StartDate UTC.
        */
        var tomorrowLocal = nowLocal.Date.AddDays(1);
        var fromUtc = TimeZoneInfo.ConvertTimeToUtc(tomorrowLocal, TurkeyTimeZone);
        var toUtc = TimeZoneInfo.ConvertTimeToUtc(tomorrowLocal.AddDays(1), TurkeyTimeZone);

        // Her uyanışta kendi kapsamımız — yukarıda anlatıldı.
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<NotificationService>();

        var trainings = await context.Trainings
            .Where(t => t.Status != TrainingStatus.Cancelled &&
                        t.StartDate >= fromUtc &&
                        t.StartDate < toUtc)
            .ToListAsync(stoppingToken);

        if (trainings.Count == 0)
        {
            return;
        }

        var reminded = 0;

        foreach (var training in trainings)
        {
            /*
            Bu eğitim için daha önce hatırlatma gitmiş mi?
            Saatte bir çalıştığımız için bu kontrol olmasa aynı
            eğitim için günde 14 bildirim giderdi.

            AnyAsync veritabanında "var mı" diye soruyor, satırları
            belleğe taşımıyor.
            */
            var alreadySent = await context.Notifications
                .AnyAsync(n => n.TrainingId == training.Id &&
                               n.Type == NotificationType.TrainingReminder,
                          stoppingToken);

            if (alreadySent)
            {
                continue;
            }

            // Servis bildirimleri hazırlıyor, kaydetmiyor — her zamanki kural.
            await notifications.TrainingReminderAsync(training);
            reminded++;
        }

        if (reminded > 0)
        {
            // Bütün eğitimlerin hatırlatmaları tek seferde kaydediliyor.
            await context.SaveChangesAsync(stoppingToken);
            _logger.LogInformation("Sent reminders for {Count} training(s).", reminded);
        }
    }
}