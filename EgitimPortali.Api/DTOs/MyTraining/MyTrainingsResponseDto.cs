namespace EgitimPortali.Api.DTOs.MyTraining;

// Tek istekte hem kutular hem liste dönüyor.
// Ayri iki endpoint olsaydi sayfa iki kere beklerdi ve
// iki cevap arasinda veri degisirse kutular listeyle celisirdi.
public class MyTrainingsResponseDto
{
    public MyTrainingSummaryDto Summary { get; set; } = new();
    public List<MyTrainingItemDto> Items { get; set; } = new();
}