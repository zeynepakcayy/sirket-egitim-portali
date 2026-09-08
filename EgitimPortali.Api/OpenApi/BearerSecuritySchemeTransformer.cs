using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace EgitimPortali.Api.OpenApi;

public class BearerSecuritySchemeTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        var scheme = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Login'den aldığın token'ı buraya yapıştır."
        };

        document.Components ??= new OpenApiComponents();
        document.AddComponent("Bearer", scheme);

        var requirement = new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference("Bearer", document)] = new List<string>()
        };

        if (document.Paths is not null)
        {
            foreach (var path in document.Paths.Values)
            {
                if (path.Operations is null) continue;

                foreach (var operation in path.Operations.Values)
                {
                    operation.Security ??= new List<OpenApiSecurityRequirement>();
                    operation.Security.Add(requirement);
                }
            }
        }

        return Task.CompletedTask;
    }
}