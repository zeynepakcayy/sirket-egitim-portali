namespace EgitimPortali.Api.DTOs;

public class RegisterRequestDto
{
   
    public string Email {get; set;} = string.Empty;
    public string Password {get; set;} = string.Empty;
     public string FullName {get; set;} = string.Empty;
    public string? Department {get; set;} = string.Empty;
}