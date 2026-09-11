//sınıfları kullanıyoruz
using EgitimPortali.Api.Models;
//hazır kullanıcı giriişi ve veritabanı kodlarını kullanabilmek için gerekli kütüphaneler
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace EgitimPortali.Api.Data;

//hazır 'kullanıcı girişi/şifre/rol sistemi' nin kopyasında düzenleme yapıldı
public class ApplicationDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    //programı çalıştırdığında, bağlanacağı db bilgisi (options) dışarıdan buraya gelir, olduğu gibi ana sisteme iletiyoruz 
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options): base(options)
        {
        }

    //tüm sınıflarımızıdb ye tablo olarak eklenmesini istediğimiz sınıfları tablo haline getiriyoruz
    public DbSet<Training> Trainings { get; set; }
    public DbSet<Application> Applications { get; set; }
    public DbSet<Certificate> Certificates { get; set; }


    //ritabanı şemasını kurarken bu metodu otomatik çağırır
    protected override void OnModelCreating(ModelBuilder builder)
    {
        
        //mutlaka ilk satır olmalı. Bu olmadan, Identity'nin kendi tabloları oluşmaz.
        base.OnModelCreating(builder);

        // Training -> Instructor (1-N): bir eğitmen birden çok eğitim açabilir
        builder.Entity<Training>()
            //eğitimin, tek bir eğitmeni var
            .HasOne(t => t.Instructor)
            //bir eğitmenin, birden çok eğitim açabilmesini sağlar
            .WithMany()
            //klon üstünden bağlantı kurar
            .HasForeignKey(t => t.InstructorUserId)
            //biri eğitmeni silmeye çalışırsa ve hâlâ açtığı eğitimler varsa, silme işlemini engelle
            .OnDelete(DeleteBehavior.Restrict);

        // Application -> User (N-1)
        builder.Entity<Application>()
            //bir başvuru, tek bir kullanıcıya aittir
            .HasOne(a => a.User)
            //bir kullanıcının birden çok başvurusu olabilir
            .WithMany(u => u.Applications)
            //başvuru tablosundaki UserId alanı ile kullanıcı tablosundaki Id alanı eşleşir
            .HasForeignKey(a => a.UserId)
            //biri kullanıcıyı silmeye çalışırsa ve hâlâ başvuruları varsa, silme işlemini engelle
            .OnDelete(DeleteBehavior.Restrict);

        // Application -> Training (N-1)
        builder.Entity<Application>()
            //bir başvuru, tek bir eğitime aittir
            .HasOne(a => a.Training)
            //bir eğitimin birden çok başvurusu olabilir
            .WithMany(t => t.Applications)
            //başvuru tablosundaki TrainingId alanı ile eğitim tablosundaki Id alanı eşleşir
            .HasForeignKey(a => a.TrainingId)
            //asıl kaydın anlamı kalmıyorsa, bağlı kayıtları da beraber temizle.
            .OnDelete(DeleteBehavior.Cascade);

        // Certificate -> Application (1-1)
        builder.Entity<Certificate>()
            //bir başvurunun, tek bir sertifikası vardır
            .HasOne(c => c.Application)
            //bir sertifika bir başvuruya aittir
            .WithOne(a => a.Certificate)
            //sertifika tablosundaki ApplicationId alanı ile başvuru tablosundaki Id alanı eşleşir
            .HasForeignKey<Certificate>(c => c.ApplicationId)
            //başvuru silinirse, ona ait üretilen sertifika kaydını da beraberinde sil
            .OnDelete(DeleteBehavior.Cascade);

        // Certificate.CertificateCode benzersiz olmalı (sahtecilik önleme, güvenlik gereksinimi)
        builder.Entity<Certificate>()
            .HasIndex(c => c.CertificateCode)
            .IsUnique();

    }

}