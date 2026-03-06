namespace WaitingRoom.API.Security;

using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

/// <summary>
/// Extensiones de configuración para registro de autenticación JWT en DI.
///
/// Configura:
/// - Esquema de autenticación JWT Bearer
/// - Validación de token (issuer, audience, lifetime, signature)
/// - Política de autorización por roles
///
/// // HUMAN CHECK: En producción con múltiples instancias, considerar
/// // usar certificados X.509 o RSA en vez de clave simétrica HMAC.
/// // Con HMAC, todas las instancias comparten el mismo secreto.
/// </summary>
public static class JwtServiceExtensions
{
    /// <summary>
    /// Registra autenticación JWT Bearer y políticas de autorización por rol.
    /// </summary>
    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services,
        JwtOptions jwtOptions)
    {
        ArgumentNullException.ThrowIfNull(jwtOptions);

        services.AddSingleton(jwtOptions);
        services.AddSingleton<JwtTokenGenerator>();

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SecretKey));

        services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtOptions.Issuer,

                    ValidateAudience = true,
                    ValidAudience = jwtOptions.Audience,

                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(2),

                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = key,

                    RequireExpirationTime = true,
                    RequireSignedTokens = true
                };

                // Soporte para SignalR: leer token del query string para WebSocket
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;

                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/ws"))
                        {
                            context.Token = accessToken;
                        }

                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("ReceptionistOnly", policy =>
                policy.RequireRole("Receptionist", "Admin"));

            options.AddPolicy("CashierOnly", policy =>
                policy.RequireRole("Cashier", "Admin"));

            options.AddPolicy("DoctorOnly", policy =>
                policy.RequireRole("Doctor", "Admin"));

            options.AddPolicy("AdminOnly", policy =>
                policy.RequireRole("Admin"));

            options.AddPolicy("ClinicalStaff", policy =>
                policy.RequireRole("Receptionist", "Cashier", "Doctor", "Admin"));
        });

        return services;
    }
}
