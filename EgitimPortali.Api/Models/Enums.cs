namespace EgitimPortali.Api.Models;

public enum TrainingStatus
{
    OpenForApplication,   // eski adı Planned'dı. Veritabanındaki karşılığı hâlâ 0.
    Ongoing,
    Completed,
    Cancelled
}

/*
Başvurunun durumu. Eski adı ApprovalStatus'tü — onay akışı
tasarımdan çıkınca hem ad hem değerler yanıltıcı kaldı.

Başvuran anında kaydolur; kontenjan doluysa yedek listeye düşer.
Kişi başvurusunu geri çekerse Cancelled olur, kayıt silinmez —
geçmiş kaybolmasın ve katılımcı listesinde "vazgeçti" görünsün diye.

Removed: kişiyi eğitmen ya da HR listeden çıkardı. Cancelled'dan
ayrı tutuluyor çünkü kişi kendi sayfasında "ben vazgeçtim" değil
"çıkarıldım" görmeli. Çıkarılan kişi aynı eğitime tekrar başvuramaz.

Veritabanında sayı olarak saklanıyor: Applied = 0, Waitlisted = 1,
Cancelled = 2, Removed = 3. SIRA ASLA DEĞİŞTİRİLMEMELİ —
yeni değerler sadece sona eklenir.
*/
public enum ApplicationStatus
{
    Applied,
    Waitlisted,
    Cancelled,
    Removed
}
public enum AttendanceStatus
{
    Pending,
    Attended,
    NotAttended
}

/*
Bildirimin türü. Ekranda görünen YAZIYI bu belirlemiyor — yazı,
bildirim oluşurken kurulup Notification.Message alanına kaydediliyor.

Bu enum iki işe yarıyor:
  1. Listede hangi ikonun görüneceği
  2. Bildirime tıklayınca hangi sayfaya gidileceği

Veritabanında sayı olarak saklanıyor.
SIRA ASLA DEĞİŞTİRİLMEMELİ — yeni türler sadece sona eklenir.
*/
public enum NotificationType
{
    TrainingUpdated,       // 0 - başvurduğun eğitimin tarihi/saati/konumu değişti
    TrainingCancelled,     // 1 - başvurduğun eğitim iptal edildi
    PromotedFromWaitlist,  // 2 - yedek listeden asıl listeye geçtin
    RemovedFromTraining,   // 3 - eğitmen ya da HR seni listeden çıkardı
    NewApplication,        // 4 - eğitmene: senin eğitimine biri başvurdu
    TrainingReminder,      // 5 - eğitimin yarın başlıyor
    CertificateReady,      // 6 - sertifikan hazır
    NewTrainingInvite      // 7 - sana yeni bir eğitim tanımlandı
}