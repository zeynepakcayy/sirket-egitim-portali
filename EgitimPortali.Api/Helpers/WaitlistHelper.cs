using EgitimPortali.Api.Data;
using EgitimPortali.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EgitimPortali.Api.Helpers;

/*
Yedek listeden terfi. Bir eğitimde kayıtlı biri ayrıldığında
(kendisi vazgeçti ya da çıkarıldı) yedekteki en eski başvuran
yukarı çıkıyor.

İki controller kullanıyor: ApplicationsController (kişi vazgeçince)
ve ParticipantsController (yönetici çıkarınca). Kopyalansaydı biri
değişince öteki unutulurdu.

Kaydetmiyor — SaveChangesAsync çağıran tarafın işi. Böylece
"kişiyi çıkar + yerine yedektekini al" tek kayıtta birlikte yapılıyor;
biri başarılı olup öteki yarım kalamıyor.

Terfi ettirdiği kaydı GERİ DÖNDÜRÜYOR. Bildirim sistemi gelince
"kim terfi etti" bilgisi gerekti; eskiden hiçbir şey döndürmüyordu
ve çağıran taraf kimi bilgilendireceğini bilemiyordu.
Yedek listede kimse yoksa null dönüyor.
*/
public static class WaitlistHelper
{
    public static async Task<Application?> PromoteNextAsync(ApplicationDbContext context, Guid trainingId)
    {
        // OrderBy şart: sıra belirsiz olsaydı her seferinde
        // farklı biri terfi edebilirdi.
        var next = await context.Applications
            .Where(a => a.TrainingId == trainingId && a.Status == ApplicationStatus.Waitlisted)
            .OrderBy(a => a.AppliedAt)
            .FirstOrDefaultAsync();

        if (next != null)
            next.Status = ApplicationStatus.Applied;

        return next;
    }
}