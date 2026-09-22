using EgitimPortali.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace EgitimPortali.Api.Helpers;

/*
"Yeni eğitime kim davet edilebilir" kuralı.

Kural: Employee ve Instructor rolündekiler, verilen kişi hariç.
HRManager yok — hiçbir eğitime başvuramıyor, davet anlamsız.

İki yer kullanıyor: davet listesini döndüren endpoint ve eğitim
oluştururken gelen kimlikleri doğrulayan kod. Kopyalansaydı
ileride rol listesi değişince biri güncellenip öteki unutulurdu.
*/
public static class InvitableUserHelper
{
    public static async Task<List<Guid>> GetIdsAsync(
        ApplicationDbContext context,
        Guid excludeUserId)
    {
        // Rol adlarından rol kimliklerini bul. Roller AspNetRoles
        // tablosunda, kullanıcı-rol eşleşmesi AspNetUserRoles'de.
        var roleIds = await context.Roles
            .Where(r => r.Name == "Employee" || r.Name == "Instructor")
            .Select(r => r.Id)
            .ToListAsync();

        return await context.UserRoles
            .Where(ur => roleIds.Contains(ur.RoleId) && ur.UserId != excludeUserId)
            .Select(ur => ur.UserId)
            // Aynı kişi iki rolde olursa bir kez sayılsın.
            .Distinct()
            .ToListAsync();
    }
}