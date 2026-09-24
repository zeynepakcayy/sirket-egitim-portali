namespace EgitimPortali.Api.DTOs.Participant;

// Yoklama isaretleme isteginin govdesi.
// Enum yerine string: JSON'dan enum okumak projenin ayarina bagli,
// string her durumda calisiyor. Controller icinde cevriliyor.
public class UpdateAttendanceDto
{
    public string Status { get; set; } = string.Empty;
}