namespace EgitimPortali.Api.DTOs.MyTraining;

// Sayfanin ustundeki kutular. Listeden toplanarak hesaplaniyor.
public class MyTrainingSummaryDto
{
    public int TrainingCount { get; set; }
    public int Registered { get; set; }
    public int Waitlisted { get; set; }
    public int Withdrawn { get; set; }
    public int Removed { get; set; }
    public int CancelledTrainings { get; set; }
}