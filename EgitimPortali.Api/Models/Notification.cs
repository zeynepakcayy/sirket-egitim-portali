using System.ComponentModel.DataAnnotations;

namespace EgitimPortali.Api.Models;

public class Notification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }            // Guid, NOT string — Identity keyed on Guid here
    public ApplicationUser? User { get; set; }
    public NotificationType Type { get; set; }   // icon + click target, not the text
    [Required]
    [MaxLength(500)]
    public string Message { get; set; } = string.Empty;
    public Guid? TrainingId { get; set; }        // an address, not a relationship
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Mail gönderildiği an. null = henüz gönderilmedi (ya da bu tip mail listesinde değil).
    public DateTime? EmailSentAt { get; set; }
}