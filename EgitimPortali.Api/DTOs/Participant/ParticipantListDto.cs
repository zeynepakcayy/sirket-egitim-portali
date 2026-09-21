namespace EgitimPortali.Api.DTOs.Participant;

/*
Seçilen eğitimin katılımcı listesi.
Kapasite de gönderiliyor: sayfadaki "18 / 20" sayacı için.
Katılımcılar başvuru tarihine göre sıralı geliyor — yedek listedeki
sıra numarası (1, 2, 3...) bu sıraya dayanıyor.
*/
public class ParticipantListDto
{
    public Guid TrainingId { get; set; }
    public string TrainingTitle { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public List<ParticipantDto> Participants { get; set; } = new();
}