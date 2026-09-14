namespace EgitimPortali.Api.Models;

public class Training
{
    public Guid Id { get; set; }

    // Eğitimi açan ve yöneten kişi. Dış eğitmenli eğitimlerde bu kişi
    // eğitimi veren değil, sisteme giren ve düzenleme yetkisi olan kişi
    public Guid InstructorUserId { get; set; }
    public ApplicationUser? Instructor { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Location { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public string Category { get; set; } = string.Empty;

    /*
    dış eğitmen bilgileri
    kişiye kullanıcı hesabu açılmaz, bilgileri tutulur
    bilgiler boşsa eğitmen olarak eğitimi açan kişi gösterilir
    */
    public string? ExternalInstructorName {get; set;}
    public string? ExternalInstructorEmail {get; set;}
    public string? ExternalInstructorOrganization {get; set;}


    public TrainingStatus Status { get; set; } = TrainingStatus.OpenForApplication;

    public ICollection<Application> Applications { get; set; } = new List<Application>();
    
}