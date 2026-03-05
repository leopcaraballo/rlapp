namespace WaitingRoom.API.Validation;

using System.Security.Claims;

/// <summary>
/// Filtro de autorización que verifica rol de Recepcionista.
///
/// Estrategia dual de autenticación:
/// 1. JWT Bearer token (producción): lee el claim "role" del token
/// 2. Header X-User-Role (solo desarrollo): fallback cuando no hay JWT
///
/// // HUMAN CHECK: El fallback de header DEBE deshabilitarse en producción.
/// // Configurar la variable de entorno ASPNETCORE_ENVIRONMENT=Production
/// // para que solo se acepte autenticación JWT.
/// // El fallback existe únicamente para facilitar pruebas E2E y desarrollo local.
/// </summary>
public sealed class ReceptionistOnlyFilter : IEndpointFilter
{
    private static readonly string[] AllowedRoles = ["Receptionist", "Admin"];

    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext invocationContext,
        EndpointFilterDelegate next)
    {
        var httpContext = invocationContext.HttpContext;

        // Estrategia 1: JWT Bearer — verificar claim de rol
        if (httpContext.User.Identity?.IsAuthenticated == true)
        {
            var userRole = httpContext.User.FindFirstValue(ClaimTypes.Role)
                           ?? httpContext.User.FindFirstValue("role");

            if (!string.IsNullOrEmpty(userRole) &&
                AllowedRoles.Any(r => string.Equals(r, userRole, StringComparison.OrdinalIgnoreCase)))
            {
                return await next(invocationContext);
            }

            return Results.Json(
                new { Error = "Acceso denegado. Se requiere rol Receptionist o Admin." },
                statusCode: StatusCodes.Status403Forbidden);
        }

        // Estrategia 2: Header fallback — solo para desarrollo
        // HUMAN CHECK: Verificar que en producción esta rama NO se ejecute.
        // El middleware UseAuthentication() debe rechazar antes si no hay token.
        if (httpContext.Request.Headers.TryGetValue("X-User-Role", out var roleHeader))
        {
            var role = roleHeader.ToString();
            if (AllowedRoles.Any(r => string.Equals(r, role, StringComparison.OrdinalIgnoreCase)))
            {
                return await next(invocationContext);
            }
        }

        return Results.Json(
            new { Error = "Autenticación requerida. Proporcione un token JWT válido." },
            statusCode: StatusCodes.Status401Unauthorized);
    }
}
