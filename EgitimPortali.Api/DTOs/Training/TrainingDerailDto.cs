/*
eğitimlerin detay sayfasında kullanıcının 
her şeyi görebilmek için

liste dto'suyla aynı bilgileri taşır tek farkı
description alanının eklenmiş olmasıdır
*/



namespace EgitimPortali.Api.DTOs.Training;

public class TrainingDetailDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string InstructorName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public int EnrolledCount { get; set; }
    public string Status { get; set; } = string.Empty;
}