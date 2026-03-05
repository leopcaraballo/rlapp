namespace WaitingRoom.Tests.Integration.Infrastructure;

using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

/// <summary>
/// Handler de autenticacion para tests de integracion.
///
/// Simula JWT Bearer: si el request incluye el header X-User-Role,
/// genera un ClaimsPrincipal autenticado con ese rol. Si no hay header,
/// retorna NoResult (no autenticado), lo que permite probar flujos de 401.
///
/// Esto garantiza que los endpoint filters usen Strategy 1 (JWT claims)
/// en lugar de Strategy 2 (header fallback de desarrollo).
/// </summary>
public sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    /// <summary>
    /// Nombre del esquema de autenticacion de prueba.
    /// </summary>
    public const string SchemeName = "TestScheme";

    /// <summary>
    /// Header utilizado para indicar el rol del usuario en los tests.
    /// Coincide con el header fallback de los filtros de endpoint.
    /// </summary>
    private const string RoleHeaderName = "X-User-Role";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    /// <inheritdoc />
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Si no hay header de rol, no autenticar (simula peticion sin token JWT)
        if (!Request.Headers.TryGetValue(RoleHeaderName, out var roleValues)
            || string.IsNullOrWhiteSpace(roleValues.FirstOrDefault()))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var role = roleValues.First()!;

        var claims = new[]
        {
            new Claim(ClaimTypes.Name, "test-user"),
            new Claim(ClaimTypes.NameIdentifier, "test-user-001"),
            new Claim(ClaimTypes.Role, role),
            new Claim("role", role),
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
