using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace EgitimPortali.Api.Services;

// Tek işi var: verilen adrese mail atmak.
// Kime, ne zaman, neden gönderileceğini bilmez - onu kuyruk servisi karar verir.
public class EmailSender
{
    private readonly string _host;
    private readonly int _port;
    private readonly string _username;
    private readonly string _password;
    private readonly string _fromAddress;
    private readonly string _fromName;

    public EmailSender(IConfiguration config)
    {
        // Ayarlar user-secrets'tan geliyor. Eksikse burada net bir hata veriyoruz,
        // mail gonderirken anlasilmaz bir hatayla patlamasin diye.
        _host = Required(config, "Email:Host");
        _username = Required(config, "Email:Username");
        _password = Required(config, "Email:Password");
        _fromAddress = Required(config, "Email:FromAddress");
        _fromName = config["Email:FromName"] ?? "Egitim Portali";
        _port = int.Parse(config["Email:Port"] ?? "2525");
    }

    private static string Required(IConfiguration config, string key)
    {
        var value = config[key];
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidOperationException(
                $"Eksik ayar: {key}. 'dotnet user-secrets set \"{key}\" \"...\"' ile ekleyin.");
        return value;
    }

    public async Task SendAsync(
        string toAddress,
        string toName,
        string subject,
        string body,
        CancellationToken token = default)
    {
        var message = new MimeMessage();

        // Kimden
        message.From.Add(new MailboxAddress(_fromName, _fromAddress));

        // Kime
        message.To.Add(new MailboxAddress(toName, toAddress));

        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = body };

        using var client = new SmtpClient();

        await client.ConnectAsync(_host, _port, SecureSocketOptions.StartTls, token);
        await client.AuthenticateAsync(_username, _password, token);
        await client.SendAsync(message, token);
        await client.DisconnectAsync(true, token);
    }
}