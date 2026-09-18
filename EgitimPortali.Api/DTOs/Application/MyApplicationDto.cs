/*
Büyük kartta "ben bu eğitime başvurmuş muyum?" sorusunun cevabı.

Katalogdaki detay isteğine eklenecek: başvurmuşsa Apply düğmesi
yerine durumu ve "Withdraw" düğmesi görünecek.
*/

namespace EgitimPortali.Api.DTOs.Application;

public class MyApplicationDto
{
    public Guid Id { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime AppliedAt { get; set; }
}