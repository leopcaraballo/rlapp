namespace WaitingRoom.API.Security;

/// <summary>
/// DTO para solicitud de token de autenticación.
/// </summary>
/// <param name="UserId">Identificador del usuario.</param>
/// <param name="UserName">Nombre visible del usuario.</param>
/// <param name="Role">Rol del usuario (Receptionist, Cashier, Doctor, Admin).</param>
public sealed record AuthTokenRequest(
    string UserId,
    string UserName,
    string Role);
