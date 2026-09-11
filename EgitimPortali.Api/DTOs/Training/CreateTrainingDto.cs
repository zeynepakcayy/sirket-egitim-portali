/*
yeni eğitim oluştururken istemciden sunucuya hangi bilgilerin
gelmesi gerektiğini belirlemek için oluşturuldu

gerçek kullanıcının doldurması gereken alanları taşır, Id'yi
sunucu üretir ve status otomatik olarak "Upcoming" olarak ayarlar.
kullanıcı 3'ünü göndermeye çalışırsa görmezden gelinir
*/


using System.ComponentModel.DataAnnotations;

namespace EgitimPortali.Api.DTOs.Training;

public class CreateTrainingDto
{
    [Required]
    [StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    [Required]
    [StringLength(200)]
    public string Location { get; set; } = string.Empty;

    [Required]
    [StringLength(50)]
    public string Category { get; set; } = string.Empty;

    [Range(1, 1000)]
    public int Capacity { get; set; }
}