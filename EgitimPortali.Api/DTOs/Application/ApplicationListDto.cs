/*
Kullanıcının kendi başvurularını listelerken dönen bilgi.
My Trainings sayfası bunu kullanacak.

Eğitim bilgileri de içinde — kullanıcı "hangi eğitime başvurmuştum"
sorusunu tek istekte cevaplayabilsin diye.
*/

using System.Text.Json.Serialization;

namespace EgitimPortali.Api.DTOs.Application;

public class ApplicationListDto
{
    public Guid Id { get; set; }
    public Guid TrainingId { get; set; }
    public string TrainingTitle { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string InstructorName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Location { get; set; } = string.Empty;

    // Başvurunun durumu: Applied, Waitlisted, Cancelled
    public string Status { get; set; } = string.Empty;
    public DateTime AppliedAt { get; set; }

    // Eğitimin durumu (hesaplanmış): OpenForApplication, Ongoing, Completed, Cancelled
    public string TrainingStatus { get; set; } = string.Empty;

    // Veritabanındaki ham eğitim durumu. Sadece hesaplama
    // sırasında kullanılıyor, frontend'e gitmiyor.
    // Tam yol yazılıyor: bu sınıfta "TrainingStatus" adında bir alan da var,
    // kısa yazılırsa C# onu enum yerine o alan sanıyor.
    [JsonIgnore]
    public EgitimPortali.Api.Models.TrainingStatus TrainingStatusRaw { get; set; }
}