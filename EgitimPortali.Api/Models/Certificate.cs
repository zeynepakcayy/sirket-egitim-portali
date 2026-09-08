namespace EgitimPortali.Api.Models;

public class Certificate{
    public Guid Id {get; set;}

    public Guid ApplicationId {get; set;}
    public Application? Application {get; set;}

    public Guid UserId {get; set;}
    public ApplicationUser? User {get; set;}

    public Guid TrainingId { get; set; }
    public Training? Training { get; set; }

    public DateTime IssuedAt {get; set;} = DateTime.UtcNow;
    public string CertificateCode {get; set;} = string.Empty;
    public string? FileUrl {get; set;}

}