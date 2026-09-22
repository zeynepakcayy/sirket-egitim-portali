using System.ComponentModel.DataAnnotations;

namespace EgitimPortali.Api.Models;

// Bir bildirim = "şu kişiye, şu olay hakkında, şu cümle gitti" kaydı.
// Zil ikonuna basınca listelenen satırların her biri bu sınıftan bir nesne.
public class Notification
{
    public Guid Id { get; set; }

    // Bildirim KİME ait.
    // Guid çünkü bu projede Identity kullanıcı kimliği Guid olarak kuruldu
    // (ApplicationDbContext'teki IdentityDbContext<..., Guid> satırı).
    public Guid UserId { get; set; }

    // Kullanıcıya giden bağ. EF Core bu satırı görünce
    // Notifications tablosuna gerçek bir yabancı anahtar kolonu açıyor.
    public ApplicationUser? User { get; set; }

    // Olayın türü. Ekrandaki YAZIYI bu belirlemiyor (yazı aşağıda hazır duruyor),
    // ama İKONU ve tıklayınca hangi sayfaya gidileceğini bu belirliyor.
    public NotificationType Type { get; set; }

    // Kullanıcının okuduğu cümlenin kendisi.
    // Bildirim oluşurken kuruluyor ve bir daha değişmiyor —
    // eğitimin adı sonradan değişse bile bildirim o günkü gerçeği anlatıyor.
    [Required]
    [MaxLength(500)]
    public string Message { get; set; } = string.Empty;

    // Hangi eğitimle ilgili. Soru işaretli çünkü ileride
    // eğitimle ilgisi olmayan bir bildirim çıkabilir, o zaman boş kalır.
    // Bu bir ilişki değil, bir ADRES: tıklayınca nereye gideceğimizi söylüyor.
    public Guid? TrainingId { get; set; }

    // Okundu mu? Zildeki kırmızı sayı, bu alanı false olanları sayıyor.
    public bool IsRead { get; set; } = false;

    // Ne zaman oluştu. Liste bunun tersine göre sıralanıyor (en yeni en üstte).
    // DİKKAT: UtcNow, Now değil. PostgreSQL yerel saatli tarihi reddediyor.
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}