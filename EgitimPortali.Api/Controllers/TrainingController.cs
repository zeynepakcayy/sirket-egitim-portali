/*
Frontend'in eğitimleri listeleyip, detayını gösterip, oluşturup,
güncelleyip, iptal edebilmesi içinbackend'de bu işlemleri yapacak
bir API katmanı gerekiyordu

Bu controller, /api/trainings altında beş endpoint sunuyor (listele, detay göster, oluştur, 
güncelle, iptal et), her isteği rol bazlı yetkiyle kontrol ediyor ve veritabanı modelini doğrudan
değil DTO'lar üzerinden dışarı veriyor.

Güncelleme ve iptal işlemleri bildirim üretiyor: eğitime kayıtlı
ve yedekteki kişilere haber gidiyor.
*/
using EgitimPortali.Api.Data;
using EgitimPortali.Api.DTOs.Training;
using EgitimPortali.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

using EgitimPortali.Api.DTOs.Common;

using EgitimPortali.Api.DTOs.Application;

using EgitimPortali.Api.Helpers;
using EgitimPortali.Api.Services;

namespace EgitimPortali.Api.Controllers;

[ApiController]
[Route("api/trainings")]
[Authorize] // controller'daki tüm endpoint'ler en az "giriş yapmış olma" ister
public class TrainingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    // Bildirim üreten servis. Program.cs'de AddScoped ile tanıtıldı.
    private readonly NotificationService _notifications;

    public TrainingsController(
        ApplicationDbContext context,
        NotificationService notifications)
    {
        _context = context;
        _notifications = notifications;
    }



    /*
    Npgsql, "timestamp with time zone" sütunlarına sadece Kind=Utc
    tarihleri yazabiliyor. İstemciden gelen tarih "+03:00" gibi bir
    saat dilimi taşıdığında .NET onu Kind=Local olarak okuyor ve
    kayıt patlıyor.

    Bu metot her durumu UTC'ye çeviriyor:
      Utc         -> dokunmuyor
      Local       -> saat dilimi farkını düşüp UTC yapıyor
      Unspecified -> sunucunun yerel saati sayıp çeviriyor
    */
    private static DateTime ToUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Local).ToUniversalTime()
        };
    }

    /*
    NOT: Buradaki GetDisplayStatus metodu kaldırıldı.
    Durum hesaplaması Helpers/TrainingStatusHelper.cs içinde duruyor —
    ApplicationsController ve ParticipantsController da aynı metodu
    kullanıyor. İki kopya olsaydı biri değişince öteki unutulurdu.
    */


    // GET /api/trainings?page=1&pageSize=10
    // Eğitimleri sayfa sayfa döndürür; her istekte veritabanından sadece istenen sayfa çekilir.
    // Neden: Tüm eğitimleri tek seferde çekmek, kayıt sayısı arttıkça veritabanını ve ağı yorar.
    [HttpGet]
    public async Task<ActionResult<PagedResult<TrainingListDto>>> GetTrainings(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? category = null,
        [FromQuery] string? instructor = null,
        [FromQuery] string? sort = null)
    {
        // Mantıksız değerleri düzeltiyoruz (ör. page=0 ya da pageSize=100000)
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;
        if (pageSize > 50) pageSize = 50;


        // Sorgu parça parça kuruluyor. Buradaki hiçbir satır veritabanına gitmiyor —
        // EF Core sadece "ne isteneceğini" not alıyor, sonunda tek bir SQL üretiyor.
        var query = _context.Trainings.AsQueryable();

        // Catalog kuralı: sadece başlangıç tarihi henüz gelmemiş eğitimler listelenir.
        // Tarihi geçmiş, devam eden ve tamamlanmış eğitimler böylece kendiliğinden elenir.
        var now = DateTime.UtcNow;
        query = query.Where(t => t.StartDate > now);


        // Kategori filtresi. Parametre hiç gönderilmediyse (All categories seçiliyse)
        // bu satır atlanır ve tüm kategoriler listelenir.
        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(t => t.Category == category);


        // Eğitmen filtresi. Gelen isim iki yerde birden aranır:
        // dış eğitmenli eğitimlerde ExternalInstructorName, diğerlerinde eğitimi açan kişinin adı.
        if (!string.IsNullOrWhiteSpace(instructor))
        {
            query = query.Where(t =>
                !string.IsNullOrEmpty(t.ExternalInstructorName)
                    ? t.ExternalInstructorName == instructor
                    : (t.Instructor != null && t.Instructor.FullName == instructor));
        }


        // 1. sorgu: toplam kayıt sayısı (sayfaya bölmeden ÖNCE sayılmalı)
        var totalCount = await query.CountAsync();


        // Sıralama. "latest" gönderilirse en uzak tarih başa gelir,
        // diğer her durumda (varsayılan dahil) en yakın tarih başa gelir.
        // ThenBy(t => t.Id) şart: aynı tarihli iki eğitimin sırası her sorguda
        // aynı kalsın diye. Sabit sıra olmazsa aynı kayıt iki sayfada çıkabilir.
        if (sort == "latest")
            query = query.OrderByDescending(t => t.StartDate).ThenBy(t => t.Id);
        else
            query = query.OrderBy(t => t.StartDate).ThenBy(t => t.Id);


        // 2. sorgu: sadece istenen sayfanın kayıtları
        var items = await query


        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(t => new TrainingListDto
        {
            Id = t.Id,
            Title = t.Title,
            // Dış eğitmen adı doluysa onu, değilse eğitimi açan kişinin adını yazıyoruz.
            // Karar burada veriliyor ki frontend her kartta aynı kontrolü tekrar yapmasın.
            InstructorName = !string.IsNullOrEmpty(t.ExternalInstructorName)
                ? t.ExternalInstructorName
                : (t.Instructor != null ? t.Instructor.FullName : string.Empty),

            StartDate = t.StartDate,
            EndDate = t.EndDate,
            Location = t.Location,
            Category = t.Category,
            Capacity = t.Capacity,
            // Kontenjanı dolduranlar sadece Applied olanlar.
            // Waitlisted yedekte bekliyor, Cancelled vazgeçmiş — ikisi de sayılmaz.
            EnrolledCount = t.Applications.Count(a => a.Status == ApplicationStatus.Applied),// Ham durum. Görünen durum aşağıda hesaplanıyor —
            // bu Select veritabanında çalıştığı için kendi
            // metodumuzu buraya koyamıyoruz.
            Status = t.Status.ToString(),
            StatusRaw = t.Status
        })
        .ToListAsync();

            
        // Veri artık hafızada; görünen durumu burada hesaplıyoruz.
        foreach (var item in items)
        {
            item.Status = TrainingStatusHelper.GetDisplayStatus(item.StatusRaw, item.StartDate, item.EndDate);
        }

        var result = new PagedResult<TrainingListDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };

        return Ok(result);
    }

    // GET /api/trainings/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<TrainingDetailDto>> GetTraining(Guid id)
    {
        var training = await _context.Trainings
            .Include(t => t.Instructor)
            .Include(t => t.Applications)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (training == null)
            return NotFound();

        // İsteği gönderen kişinin kimliğini token'dan okuyoruz.
        // Aşağıda, bu eğitimi açan kişiyle aynı mı diye karşılaştıracağız.
        var currentUserIdText = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid.TryParse(currentUserIdText, out var currentUserId);


        /*
        Bu kişinin bu eğitimdeki başvurusu. Yoksa null kalıyor.
        HRManager hiç başvuramadığı için onda hep null olacak.
        Başvurular yukarıdaki Include ile zaten çekildi —
        ek bir veritabanı isteği olmuyor.
        */
        var myApplication = training.Applications
            .Where(a => a.UserId == currentUserId)
            .Select(a => new MyApplicationDto
            {
                Id = a.Id,
                Status = a.Status.ToString(),
                AppliedAt = a.AppliedAt
            })
            .FirstOrDefault();


        var dto = new TrainingDetailDto
        {
            Id = training.Id,
            Title = training.Title,
            Description = training.Description,

            //dış eğitmen adın doluysa onu değilse eğitimi açan kişinin adı
            InstructorName = !string.IsNullOrEmpty(training.ExternalInstructorName)
                ? training.ExternalInstructorName
                : training.Instructor?.FullName ?? string.Empty,
            // Dış eğitmende kurum, iç eğitmende departman. İkisi de boşsa null kalır,
            // frontend o satırı hiç göstermez.
            InstructorAffiliation = !string.IsNullOrEmpty(training.ExternalInstructorName)
                ? training.ExternalInstructorOrganization
                : training.Instructor?.Department,

            InstructorEmail = !string.IsNullOrEmpty(training.ExternalInstructorName)
                ? training.ExternalInstructorEmail
                : training.Instructor?.Email,


            StartDate = training.StartDate,
            EndDate = training.EndDate,
            Location = training.Location,
            Category = training.Category,
            Capacity = training.Capacity,
            EnrolledCount = training.Applications.Count(a => a.Status == ApplicationStatus.Applied), 
            Status = TrainingStatusHelper.GetDisplayStatus(training.Status, training.StartDate, training.EndDate),

            //eğitimi açan kili isteği gönderen kişiyle aynı mı
            IsOwner = training.InstructorUserId == currentUserId,
            //okuma tarafında 3 alanun kuralın aynısı
            //externalInstructorName doluysa dış eğitmen
            IsExternalInstructor = !string.IsNullOrEmpty(training.ExternalInstructorName),
        
            MyApplication = myApplication


        };

        return Ok(dto);
    }

    // POST /api/trainings
    [HttpPost]
    [Authorize(Roles = "Instructor,HRManager")]
    public async Task<IActionResult> CreateTraining(CreateTrainingDto dto)
    {
        // Eğitmenin kim olduğunu istemciden ALMIYORUZ, token'dan okuyoruz.
        // Neden: Yoksa biri "ben Ahmet adına eğitim açıyorum" diye sahte ID gönderebilirdi.
        var instructorIdText = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (instructorIdText == null || !Guid.TryParse(instructorIdText, out var instructorId))
            return Unauthorized();

    
        // Dış eğitmenli eğitim açmak sadece HRManager'a ait.
        // Instructor rolündeki kişi yalnızca kendi adına eğitim açabilir.
        // Frontend'de kutuyu gizlemek koruma sağlamaz — istek Swagger'dan
        // ya da başka bir araçtan elle gönderilebilir.
        var isExternalRequest =
            !string.IsNullOrWhiteSpace(dto.ExternalInstructorName) ||
            !string.IsNullOrWhiteSpace(dto.ExternalInstructorEmail) ||
            !string.IsNullOrWhiteSpace(dto.ExternalInstructorOrganization);

        if (isExternalRequest && !User.IsInRole("HRManager"))
            return Forbid();

        var training = new Training
        {
            Id = Guid.NewGuid(),
            InstructorUserId = instructorId,
            Title = dto.Title,
            Description = dto.Description,
            StartDate = ToUtc(dto.StartDate),
            EndDate = ToUtc(dto.EndDate),
            Location = dto.Location,
            Category = dto.Category,
            Capacity = dto.Capacity,

            // Dış eğitmen bilgileri. Boş gelirse null kalır ve eğitim
            // iç eğitmenli sayılır — okuma tarafındaki kontroller
            // ExternalInstructorName'e bakarak karar veriyor.
            ExternalInstructorName = dto.ExternalInstructorName,
            ExternalInstructorEmail = dto.ExternalInstructorEmail,
            ExternalInstructorOrganization = dto.ExternalInstructorOrganization,

            Status = TrainingStatus.OpenForApplication
        };

        _context.Trainings.Add(training);

        /*
        Davet bildirimleri. Yeni eğitim HERKESE duyurulmuyor —
        eğitimi açan kişi formda seçtiği kişilere gidiyor.

        Gelen kimlikler doğrulanıyor: istemciden geldiği için
        güvenilmez. Doğrulamasak biri Swagger'dan rastgele bir kimlik
        gönderebilir ve olmayan bir kullanıcıya bildirim yazmaya
        çalışınca yabancı anahtar hatası alır, 500 dönerdi.

        Kesişim aynı zamanda kuralı da uyguluyor: HRManager'ın kimliği
        gönderilse bile listede olmadığı için elenip gidiyor.
        */
        if (dto.InviteUserIds != null && dto.InviteUserIds.Count > 0)
        {
            var invitableIds = await InvitableUserHelper.GetIdsAsync(_context, instructorId);
            var validIds = dto.InviteUserIds.Intersect(invitableIds).ToList();

            if (validIds.Count > 0)
            {
                _notifications.NewTrainingInvite(validIds, training);
            }
        }

        // Eğitim ve davet bildirimleri tek seferde kaydediliyor:
        // eğitim oluşmazsa davet de gitmiyor.
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTraining), new { id = training.Id }, training.Id);
       
       }

    // PUT /api/trainings/{id}
    // Var olan bir eğitimi günceller (Status dahil). Instructor ve HRManager çağırabilir.
    // Neden: Eğitim bilgileri değişebilir, durumu (Planned->Completed gibi) de değişebilir.
    [HttpPut("{id}")]
    [Authorize(Roles = "Instructor,HRManager")]
    public async Task<IActionResult> UpdateTraining(Guid id, UpdateTrainingDto dto)
    {
        var training = await _context.Trainings.FindAsync(id);
        if (training == null)
            return NotFound();


        // Sahiplik kontrolü: isteği gönderen kişiyi token'dan okuyup
        // eğitimi açan kişiyle karşılaştırıyoruz.
        // Frontend'de Edit düğmesini gizlemek koruma sağlamaz, istek elle gönderilebilir.
        var currentUserIdText = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (currentUserIdText == null || !Guid.TryParse(currentUserIdText, out var currentUserId))
            return Unauthorized();

        // Sahiplik kuralı: Instructor sadece kendi eğitimini düzenleyebilir.
        // HRManager ise hepsini — kurumsal sorumluluk onda.
        if (training.InstructorUserId != currentUserId && !User.IsInRole("HRManager"))
            return Forbid();

    
        // Create'deki kuralın aynısı: dış eğitmen bilgisi girmek
        // sadece HRManager'a ait.
        var isExternalRequest =
            !string.IsNullOrWhiteSpace(dto.ExternalInstructorName) ||
            !string.IsNullOrWhiteSpace(dto.ExternalInstructorEmail) ||
            !string.IsNullOrWhiteSpace(dto.ExternalInstructorOrganization);

        if (isExternalRequest && !User.IsInRole("HRManager"))
            return Forbid();



        // İstemciden gelen "Completed" gibi bir metni enum değerine çeviriyoruz.
        // Geçersiz bir metin gelirse (yazım hatası vs.) uygulama çökmesin, 400 dönsün diye TryParse kullanıyoruz.
    
        if (!Enum.TryParse<TrainingStatus>(dto.Status, out var parsedStatus))
            return BadRequest("Invalid status value.");

        /*
        Eski değerleri kenara alıyoruz. Aşağıdaki satırlar bunların
        üzerine yazacak ve o andan sonra "gerçekten değişti mi" sorusunu
        cevaplayacak başka bir kaynak kalmayacak.

        Sadece bildirim kararını etkileyen alanlar saklanıyor: tarih,
        saat, konum ve durum. Başlık ya da açıklama değişikliği bildirim
        üretmiyor — gereksiz bildirim, bildirimi değersizleştirir.
        */
        var oldStartDate = training.StartDate;
        var oldEndDate = training.EndDate;
        var oldLocation = training.Location;
        var oldStatus = training.Status;

        training.Title = dto.Title;
        training.Description = dto.Description;
        training.StartDate = ToUtc(dto.StartDate);
        training.EndDate = ToUtc(dto.EndDate);
        training.Location = dto.Location;
        training.Category = dto.Category;
        training.Capacity = dto.Capacity;

        // Dış eğitmen bilgileri güncellemede de değişebilir.
        // Formda alanlar boşaltılırsa null yazılır ve eğitim
        // iç eğitmenliye döner — istenen davranış bu.
        training.ExternalInstructorName = dto.ExternalInstructorName;
        training.ExternalInstructorEmail = dto.ExternalInstructorEmail;
        training.ExternalInstructorOrganization = dto.ExternalInstructorOrganization;

        training.Status = parsedStatus;

        /*
        Bildirim kararı. İki soru soruyoruz:
          1. Eğitim YENİ mi iptal edildi?
          2. Tarih, saat ya da konum değişti mi?

        justCancelled'da iki koşul birden aranıyor: önceden iptal DEĞİLDİ
        ve şimdi iptal. Sadece ikinciye bakılsaydı, iptal edilmiş bir eğitim
        her kaydedildiğinde herkese tekrar bildirim giderdi.
        */
        var justCancelled =
            oldStatus != TrainingStatus.Cancelled &&
            training.Status == TrainingStatus.Cancelled;

        var scheduleChanged =
            training.StartDate != oldStartDate ||
            training.EndDate != oldEndDate ||
            training.Location != oldLocation;

        /*
        "else if" bilinçli bir seçim: hem iptal edilip hem tarihi
        değiştirilirse sadece iptal bildirimi gidiyor. İptal edilmiş
        bir eğitim için "tarihi değişti" demek anlamsız.

        Bildirimler SaveChangesAsync'ten önce hazırlanıyor; güncelleme
        ile birlikte tek seferde kaydediliyor.
        */
        if (justCancelled)
            await _notifications.TrainingCancelledAsync(training, currentUserId);
        else if (scheduleChanged)
            await _notifications.TrainingUpdatedAsync(training, currentUserId);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE /api/trainings/{id}
    // Eğitimi GERÇEKTEN silmez, sadece Status'u "Cancelled" yapar (soft delete).
    // Neden: Silinen eğitime bağlı başvuru geçmişi kaybolmasın, kullanıcılar eğitimi "iptal edilmiş" olarak görsün.
    // Sadece HRManager çağırabilir.
    [HttpDelete("{id}")]
    [Authorize(Roles = "HRManager")]
    public async Task<IActionResult> DeleteTraining(Guid id)
    {
        var training = await _context.Trainings.FindAsync(id);
        if (training == null)
            return NotFound();



        // Sahiplik kontrolü: rol yetmez, eğitimi sadece onu açan kişi düzenleyebilir.
        // Frontend'de Edit düğmesini gizlemek koruma sağlamaz, istek elle gönderilebilir.
        var currentUserIdText = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (currentUserIdText == null || !Guid.TryParse(currentUserIdText, out var currentUserId))
            return Unauthorized();

        // Bu endpoint zaten sadece HRManager'a açık ([Authorize] özniteliği).
        // HRManager herkesin eğitimini iptal edebilir, ayrı bir
        // sahiplik kontrolü gerekmiyor.

        
        /*
        İptal iki farklı yoldan yapılabiliyor: düzenleme formundaki
        Status kutusundan ve buradan. İkisi de bildirim üretmeli,
        yoksa hangi yolun kullanıldığına göre bazı kullanıcılar
        haberdar olmazdı.

        Zaten iptalliyse bildirim tekrar gitmiyor.
        */
        var wasAlreadyCancelled = training.Status == TrainingStatus.Cancelled;

        training.Status = TrainingStatus.Cancelled;

        if (!wasAlreadyCancelled)
            await _notifications.TrainingCancelledAsync(training, currentUserId);

        await _context.SaveChangesAsync();

        return NoContent();
    }


        // GET /api/trainings/instructors
    // Catalog'daki eğitmen filtresi için, tekrarsız eğitmen adları listesi.
    // Neden ayrı endpoint: GET /api/trainings sayfalı çalışıyor, frontend sadece
    // o anki sayfayı görüyor. Açılır liste ise tüm eğitmenleri göstermeli.
    [HttpGet("instructors")]
    public async Task<ActionResult<List<string>>> GetInstructorNames()
    {
        var now = DateTime.UtcNow;

        var names = await _context.Trainings
            .Where(t => t.StartDate > now)
            // Liste kartındaki isimle aynı kural: dış eğitmen varsa onun adı.
            .Select(t => !string.IsNullOrEmpty(t.ExternalInstructorName)
                ? t.ExternalInstructorName
                : (t.Instructor != null ? t.Instructor.FullName : string.Empty))
            .Where(name => name != string.Empty)
            .Distinct()
            .OrderBy(name => name)
            .ToListAsync();

        return Ok(names);
    }


}