/*
Listeleme endpoint'leri tüm kayıtları değil, sadece istenen sayfayı döndürüyor.
Frontend'in sayfa numaralarını gösterebilmesi için kayıtların yanında
toplam kayıt sayısı ve sayfa bilgisi de gönderilmeli.

Bu sınıf, bir sayfalık kaydı ve sayfalama bilgilerini tek bir cevapta taşıyan
ortak bir kutu. <T> sayesinde eğitim, başvuru, sertifika gibi her liste için kullanılabilir.
*/


/*
Items: sayfanın kayıtlarnı taşır
TotalCount: Tüm kayıt sayısını taşır
Page/PageSize: hangis sayfa, kaç kayıt var onu taşır
TotalPages: toplam sayfayı taşır
*/

namespace EgitimPortali.Api.DTOs.Common;

public class PagedResult<T>
{
    // O sayfadaki kayıtlar (ör. 10 eğitim)
    public List<T> Items { get; set; } = new();

    // Filtreye uyan TÜM kayıtların sayısı (sadece bu sayfanınki değil)
    public int TotalCount { get; set; }

    // Şu anki sayfa numarası (1'den başlar)
    public int Page { get; set; }

    // Bir sayfada kaç kayıt var
    public int PageSize { get; set; }

    // Toplam sayfa sayısı, diğer alanlardan hesaplanır
    // PageSize 0 olursa sıfıra bölme olmasın diye kontrol var
    public int TotalPages => PageSize == 0 ? 0 : (int)Math.Ceiling((double)TotalCount / PageSize);
}