namespace EgitimPortali.Api.Models;

public class Application
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }

    public Guid TrainingId { get; set; }
    public Training? Training { get; set; }

    public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
    public ApprovalStatus ApprovalStatus { get; set; } = ApprovalStatus.Pending;
    public AttendanceStatus AttendanceStatus { get; set; } = AttendanceStatus.Pending;

    public Certificate? Certificate { get; set; }
}
