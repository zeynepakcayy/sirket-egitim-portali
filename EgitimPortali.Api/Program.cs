using EgitimPortali.Api.Data;
using EgitimPortali.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;

//jwt üretiminin ve doğrulamasının yapılabilmesi için gerekli kütüphaneler
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

using EgitimPortali.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<EgitimPortali.Api.OpenApi.BearerSecuritySchemeTransformer>();
});


/*Uygulama başlarken, ApplicationDbContext'i hazırla, hazırlarken PostgreSQL kullan ve 
bağlantı bilgisi olarak da appsettings.json'daki DefaultConnection yazan yeri oku.*/
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

/*uygulamada Identity ekle, kullanıcı olarak ApplicationUser sınıfını kullan, rol olarak da IdentityRole<Guid> sınıfını
kullan. Bunları ApplicationDbContext ile ilişkilendir.*/
builder.Services.AddIdentity<ApplicationUser, IdentityRole<Guid>>()
    .AddEntityFrameworkStores<ApplicationDbContext>();

//secretkey'i appsettings.json'dan oku
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"];
//uygulamaya bir kimlik doğrulama sistemi ekle, bu sistem JWT token'a bakarak kullanıcıyı tanısın
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,

        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(secretKey!))
    };
});
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<NotificationService>();

builder.Services.AddScoped<EmailSender>();

// Arka planda çalışan hatırlatma görevi. AddScoped değil AddHostedService:
// bir isteğe bağlı değil, uygulama boyunca kendi başına çalışıyor.
builder.Services.AddHostedService<TrainingReminderService>();

builder.Services.AddHostedService<EmailQueueService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});


var app = builder.Build();


using (var scope = app.Services.CreateScope())
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
    string[] roles = { "Employee", "Instructor", "HRManager" };

    foreach (var roleName in roles)
    {
        var roleExists = await roleManager.RoleExistsAsync(roleName);
        if (!roleExists)
        {
            await roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
        }
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "EgitimPortali API v1");
    }); 
}

app.UseHttpsRedirection();


app.UseCors("AngularPolicy");

//jwt doğrulama middleware'ini ekle
app.UseAuthentication();
app.UseAuthorization();


app.MapControllers();

app.Run();
