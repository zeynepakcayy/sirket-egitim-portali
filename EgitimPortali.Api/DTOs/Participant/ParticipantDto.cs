namespace EgitimPortali.Api.DTOs.Participant;

/*
Bir eğitime başvurmuş bir kişi. Kimliği ApplicationId —
çıkarma isteği bu kimlikle gönderiliyor, kullanıcı kimliğiyle değil:
aynı kişinin farklı eğitimlerde farklı başvuruları var.
*/
public class ParticipantDto
{
    public Guid ApplicationId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Department { get; set; }

    // Applied, Waitlisted, Cancelled, Removed
    public string Status { get; set; } = string.Empty;
        
    // "Pending", "Attended" ya da "NotAttended"
    public string Attendance { get; set; } = string.Empty;
    public DateTime AppliedAt { get; set; }
}