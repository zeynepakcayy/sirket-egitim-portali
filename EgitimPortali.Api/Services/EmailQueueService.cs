using EgitimPortali.Api.Data;
using EgitimPortali.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EgitimPortali.Api.Services;

// Dakikada bir calisir, maili gonderilmemis bildirimleri bulur ve gonderir.
public class EmailQueueService : BackgroundService
{
    // Sadece bu tipler mail olarak da gider. Digerleri uygulama ici kalir.
    private static readonly NotificationType[] EmailTypes =
    {
        NotificationType.TrainingUpdated,
        NotificationType.TrainingCancelled,
        NotificationType.PromotedFromWaitlist,
        NotificationType.RemovedFromTraining,
        NotificationType.TrainingReminder
    };

    private const int BatchSize = 20;
    private static readonly TimeSpan MaxAge = TimeSpan.FromDays(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EmailQueueService> _logger;

    public EmailQueueService(IServiceScopeFactory scopeFactory, ILogger<EmailQueueService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));

        do
        {
            try
            {
                await SendPendingAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                // Bir tur patlasa bile servis olmesin, bir dakika sonra tekrar denesin.
                _logger.LogError(ex, "Email queue pass failed.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task SendPendingAsync(CancellationToken token)
    {
        // BackgroundService singleton, DbContext scoped -> kendi scope'umuzu aciyoruz.
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var sender = scope.ServiceProvider.GetRequiredService<EmailSender>();

        var cutoff = DateTime.UtcNow - MaxAge;

        var pending = await context.Notifications
            .Include(n => n.User)
            .Where(n => n.EmailSentAt == null
                        && n.CreatedAt >= cutoff
                        && EmailTypes.Contains(n.Type))
            .OrderBy(n => n.CreatedAt)
            .Take(BatchSize)
            .ToListAsync(token);

        if (pending.Count == 0) return;

        var sent = 0;

        foreach (var notification in pending)
        {
            var address = notification.User?.Email;

            if (string.IsNullOrWhiteSpace(address))
            {
                // Adresi olmayan kullaniciyi sonsuza kadar denemeyelim, damgalayip geciyoruz.
                notification.EmailSentAt = DateTime.UtcNow;
                continue;
            }

            try
            {
                await sender.SendAsync(
                    address,
                    notification.User?.FullName ?? address,
                    SubjectFor(notification.Type),
                    notification.Message,
                    token);

                notification.EmailSentAt = DateTime.UtcNow;
                sent++;
            }
            catch (Exception ex)
            {
                // EmailSentAt null kaliyor -> bir sonraki turda tekrar denenecek.
                _logger.LogError(ex, "Email failed for notification {Id}.", notification.Id);
            }
        }

        await context.SaveChangesAsync(token);

        if (sent > 0)
            _logger.LogInformation("Sent {Count} notification e-mail(s).", sent);
    }

    private static string SubjectFor(NotificationType type) => type switch
    {
        NotificationType.TrainingCancelled => "Training cancelled",
        NotificationType.TrainingUpdated => "Training details changed",
        NotificationType.PromotedFromWaitlist => "You are off the waitlist",
        NotificationType.RemovedFromTraining => "You have been removed from a training",
        NotificationType.TrainingReminder => "Your training starts tomorrow",
        _ => "Notification"
    };
}