using Microsoft.AspNetCore.Identity;

namespace EgitimPortali.Api.Models;

public class ApplicationUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Training> TrainingsCreated { get; set; } = new List<Training>();
    public ICollection<Application> Applications { get; set; } = new List<Application>();
}