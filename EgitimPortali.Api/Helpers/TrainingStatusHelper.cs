using EgitimPortali.Api.Models;

namespace EgitimPortali.Api.Helpers;

/*
Eğitimin görünen durumunu hesaplar. Birden fazla controller
kullandığı için ortak bir yerde duruyor — kopyalansaydı biri
değişince öteki unutulurdu.

Veritabanında sadece iki değer tutuluyor: OpenForApplication
ya da Cancelled. Ongoing ve Completed tarihten hesaplanıyor —
ayrı tutulsaydı eğitim bittiğinde birinin gidip durumu
güncellemesi gerekirdi, unutulursa kayıt gerçekle çelişirdi.

İptal her şeyin önünde: iptal edilmiş bir eğitim tarihi geçse de
"tamamlandı" sayılmaz.
*/
public static class TrainingStatusHelper
{
    public static string GetDisplayStatus(TrainingStatus status, DateTime startDate, DateTime endDate)
    {
        if (status == TrainingStatus.Cancelled)
            return TrainingStatus.Cancelled.ToString();

        var now = DateTime.UtcNow;

        if (now > endDate)
            return TrainingStatus.Completed.ToString();

        if (now >= startDate)
            return TrainingStatus.Ongoing.ToString();

        return TrainingStatus.OpenForApplication.ToString();
    }
}