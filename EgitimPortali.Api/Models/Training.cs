namespace EgitimPortali.Api.Models;

public class Training
{
    public Guid Id { get; set; }
    public Guid InstructorUserId { get; set; }
    public ApplicationUser? Instructor { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Location { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public string Category { get; set; } = string.Empty;
    public TrainingStatus Status { get; set; } = TrainingStatus.Planned;

    public ICollection<Application> Applications { get; set; } = new List<Application>();
    
}