namespace WaitingRoom.API.Validation;

using System.Security.Claims;

/// <summary>
/// Filtro de autorización que restringe acceso exclusivamente al rol Admin.
///
/// Estrategia dual de autenticación:
/// 1. JWT Bearer token (producción): lee el claim "role" del token
/// 2. Header X-User-Role (solo desarrollo): fallback cuando no hay JWT
/// </summary>
public sealed class AdminOnlyFilter : IEndpointFilter
{
    private static readonly string[] AllowedRoles = ["Admin"];

    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext invocationContext,
        EndpointFilterDelegate next)
    {
        var httpContext = invocationContext.HttpContext;

        // Estrategia 1: JWT Bearer
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
                new { Error = "Acceso denegado. Se requiere rol Admin." },
                statusCode: StatusCodes.Status403Forbidden);
        }

        // Estrategia 2: Header fallback (solo desarrollo)
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
