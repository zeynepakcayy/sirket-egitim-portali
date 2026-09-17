
/*
training katalog sayfasındaki kart listeisinde yer alan
eğitimlerleri gereğinden fazla veri taşımamak için oluşturuldu

sunucudan istemciye, eğitimin liste kartında görünecek özet
bilgileri taşıyor
*/
using System.Text.Json.Serialization;
using EgitimPortali.Api.Models;

namespace EgitimPortali.Api.DTOs.Training;



public class TrainingListDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string InstructorName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public int EnrolledCount { get; set; }

    public string Status { get; set; } = string.Empty;

    // Veritabanındaki ham durum. Sadece hesaplama sırasında
    // kullanılıyor, frontend'e gitmesine gerek yok.
    [JsonIgnore]
    public TrainingStatus StatusRaw { get; set; }
}
