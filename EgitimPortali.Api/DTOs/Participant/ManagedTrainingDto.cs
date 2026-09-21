namespace EgitimPortali.Api.DTOs.Participant;

/*
Participants sayfasındaki açılır listenin bir satırı.
HRManager tüm eğitimleri, Instructor sadece kendi açtıklarını görüyor.
Tarih de gönderiliyor: aynı adlı iki eğitim olursa ayırt edilsin diye.
*/
public class ManagedTrainingDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }

    // Hesaplanmış durum (OpenForApplication, Ongoing, Completed, Cancelled)
    public string Status { get; set; } = string.Empty;
}