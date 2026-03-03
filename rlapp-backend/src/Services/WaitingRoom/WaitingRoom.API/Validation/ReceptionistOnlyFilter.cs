namespace WaitingRoom.API.Validation;

/// <summary>
/// Enforces receptionist role for reception check-in endpoints.
/// Expected header: X-User-Role: Receptionist
/// </summary>
public sealed class ReceptionistOnlyFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext invocationContext,
        EndpointFilterDelegate next)
    {
        var httpContext = invocationContext.HttpContext;

        if (!httpContext.Request.Headers.TryGetValue("X-User-Role", out var roleHeader))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var role = roleHeader.ToString();
        if (!string.Equals(role, "Receptionist", StringComparison.OrdinalIgnoreCase))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        return await next(invocationContext);
    }
}
