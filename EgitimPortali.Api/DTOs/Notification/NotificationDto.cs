namespace EgitimPortali.Api.DTOs.Notification;

/*
Frontend'e giden bildirim paketi.

UserId burada YOK — zaten o kişiye gönderiyoruz, tekrar söylemenin
anlamı yok. Veritabanındaki satırda var, dışarı çıkmıyor.
*/
public class NotificationDto
{
    // Okundu işaretlemek için lazım.
    public Guid Id { get; set; }

    // Metin değil, sayı gidiyor olsaydı frontend 0,1,2 ile uğraşırdı.
    // "TrainingCancelled" gibi okunur bir metne çeviriyoruz.
    public string Type { get; set; } = string.Empty;

    // Ekranda görünen cümle. Bildirim oluşurken hazırlanmıştı.
    public string Message { get; set; } = string.Empty;

    // Tıklayınca hangi eğitime gidileceği. Boş olabilir.
    public Guid? TrainingId { get; set; }

    // Okunmamışlar listede daha belirgin görünecek.
    public bool IsRead { get; set; }

    // "2 saat önce" yazısı bundan hesaplanıyor.
    public DateTime CreatedAt { get; set; }
}