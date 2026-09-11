/*
var olan bir eğitimin düzenlenirken hangi bilgilerin
değiştirilebileceğini sınırlarmak için oluşturuldu

create'deki  alanlar + status'u taşır. Id taşımaz çünkü zaten route
parametresi, eğitmen bilgisi de taşınmaz çünkü bir eğitmenin eğitimi
sonradan değiştirilemez
*/


using System.ComponentModel.DataAnnotations;

namespace EgitimPortali.Api.DTOs.Training;

public class UpdateTrainingDto
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

    [Required]
    public string Status { get; set; } = string.Empty;
}