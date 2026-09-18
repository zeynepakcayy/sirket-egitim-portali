/*
eğitimin büyük kartında gösterilecek tam bilgiler.

liste DTO'sundakilere ek olarak açıklama, eğitmenin iletişim
bilgileri ve düzenleme yetkisi bilgisi taşır.
*/


namespace EgitimPortali.Api.DTOs.Training;

public class TrainingDetailDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string InstructorName { get; set; } = string.Empty;


    // Eğitmenin bağlı olduğu yer. İçeriden biriyse departmanı,
    // dışarıdan biriyse çalıştığı kurum yazılır. Boşsa kartta o satır gösterilmez.
    public string? InstructorAffiliation { get; set; }

    // Eğitmenin e-postası. İç eğitmende hesabındaki adres,
    // dış eğitmende elle girilen adres.
    public string? InstructorEmail { get; set; }

    // Bu eğitimi açan kişi, isteği gönderen kişinin kendisi mi?
    // Backend token'a bakıp dolduruyor. Frontend buna göre Edit düğmesini gösterir.
    public bool IsOwner { get; set; }


    // Bu eğitim dış eğitmenli mi? Backend zaten biliyor —
    // InstructorName tek alan olarak geldiği için frontend
    // buna bakarak tahmin yürütmek zorunda kalmasın diye eklendi.
    // Düzenleme formu onay kutusunu bununla işaretliyor.
    public bool IsExternalInstructor { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public int EnrolledCount { get; set; }
    public string Status { get; set; } = string.Empty;
}