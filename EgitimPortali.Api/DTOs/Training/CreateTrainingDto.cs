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


    
    /*
    Dış eğitmen bilgileri. Üçü de isteğe bağlı (nullable).
    Kural: ExternalInstructorName doluysa eğitim "dış eğitmenli" sayılır —
    okuma tarafındaki tüm kontroller bu alana bakıyor.
    Boş bırakılırsa eğitmen olarak eğitimi açan kişi gösterilir.
    */
    [StringLength(200)]
    public string? ExternalInstructorName { get; set; }

    // EmailAddress: girilen metin e-posta biçiminde değilse istek 400 döner.
    // Alan boş bırakılabilir, ama doluysa geçerli olmak zorunda.
    [EmailAddress]
    [StringLength(200)]
    public string? ExternalInstructorEmail { get; set; }

    [StringLength(200)]
    public string? ExternalInstructorOrganization { get; set; }
}