namespace EgitimPortali.Api.DTOs.User;

/*
Davet listesinde görünecek kişi.

E-posta BİLEREK yok. Seçim kutusunda ad ve departman gösteriliyor,
e-postaya ihtiyaç duyulmuyor. Gerekmeyen kişisel veriyi dışarı
çıkarmamak, çıkarıp kullanmamaktan iyidir.

Departman var çünkü aynı adda iki kişi olabilir; hangisi olduğunu
ayırt etmenin tek yolu o.
*/
public class InvitableUserDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Department { get; set; }
}