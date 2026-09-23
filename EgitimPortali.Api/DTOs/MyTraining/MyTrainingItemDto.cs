namespace EgitimPortali.Api.DTOs.MyTraining;

// Listedeki bir satir. Egitimin kendi bilgileri + katilimci sayilari.
public class MyTrainingItemDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Category { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Location { get; set; }
    public int Capacity { get; set; }

    // Hesaplanmis durum (Cancelled / Completed / Ongoing / OpenForApplication)
    public string Status { get; set; } = string.Empty;

    // HR herkesin egitimini gordugu icin kimin actigi onemli
    public string OrganizerName { get; set; } = string.Empty;

    // "Only mine" filtresi bunu kullaniyor
    public bool IsMine { get; set; }

    public int RegisteredCount { get; set; }
    public int WaitlistCount { get; set; }
    public int WithdrawnCount { get; set; }
    public int RemovedCount { get; set; }
}