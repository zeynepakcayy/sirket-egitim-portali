/*
Backend'den gelen bildirimin frontend'deki karşılığı.
NotificationsController'ın döndürdüğü NotificationDto ile birebir aynı.

Alan adları küçük harfle başlıyor: C#'ta IsRead yazıyoruz ama .NET
JSON'a çevirirken baş harfi küçültüyor, tarayıcıya isRead olarak geliyor.
*/

// Bildirimin türü. Backend metin olarak gönderiyor (sayı değil),
// bu yüzden burada da metin. Sekiz seçenekten biri olmak zorunda —
// yanlış yazarsak derleyici yakalıyor.
export type NotificationType =
  | 'TrainingUpdated'
  | 'TrainingCancelled'
  | 'PromotedFromWaitlist'
  | 'RemovedFromTraining'
  | 'NewApplication'
  | 'TrainingReminder'
  | 'CertificateReady'
  | 'NewTrainingInvite';

/*
Zilin açılır listesindeki tek bir satır.

Adı neden NotificationItem, neden sadece Notification değil:
tarayıcının kendi Notification diye bir tipi var (masaüstü bildirimleri
için). Aynı adı kullansak hangisinden bahsettiğimiz karışır ve
yanlış olanı kullanırsak hata mesajı hiç anlaşılmaz olur.
*/
export interface NotificationItem {
  // Okundu işaretlemek için gereken kimlik.
  id: string;

  // İkonu ve tıklayınca gidilecek sayfayı bu belirliyor.
  type: NotificationType;

  // Ekranda görünen cümle. Backend'de hazırlanmış, olduğu gibi basılıyor.
  message: string;

  // Tıklayınca hangi eğitime gidilecek. Eğitimle ilgisi olmayan
  // bir bildirim olabilir, o yüzden null olabiliyor.
  trainingId: string | null;

  // Okunmamışlar listede nokta alıyor ve yazısı daha parlak.
  isRead: boolean;

  // "2 hours ago" yazısı bundan hesaplanıyor.
  // Metin olarak geliyor (ISO biçimi), Date'e çevirmek bize kalıyor.
  createdAt: string;
}

/*
Okunmamış sayısı endpoint'inin cevabı: { "count": 3 }
Tek bir sayı için ayrı bir arayüz fazla görünebilir ama servisin
ne döndürdüğü böyle net oluyor; düz "number" desek {count: 3}
nesnesiyle sayının kendisi karışırdı.
*/
export interface UnreadCount {
  count: number;
}