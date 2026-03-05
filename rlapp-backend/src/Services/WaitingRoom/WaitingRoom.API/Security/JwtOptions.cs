namespace WaitingRoom.API.Security;

/// <summary>
/// Opciones de configuración para autenticación JWT.
///
/// Se enlazan desde la sección "Jwt" de appsettings.json.
///
/// // HUMAN CHECK: En producción, la clave secreta DEBE provenir de un vault seguro
/// // (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault).
/// // NUNCA almacenar la clave en appsettings.json en texto plano para producción.
/// // La clave incluida aquí es SOLO para desarrollo local y pruebas.
/// </summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    /// <summary>
    /// Clave secreta para firmar y validar tokens (mínimo 32 caracteres).
    /// </summary>
    public string SecretKey { get; init; } = "rlapp-dev-secret-key-replace-in-production-min32chars!";

    /// <summary>
    /// Emisor del token (iss claim).
    /// </summary>
    public string Issuer { get; init; } = "rlapp-api";

    /// <summary>
    /// Audiencia válida del token (aud claim).
    /// </summary>
    public string Audience { get; init; } = "rlapp-client";

    /// <summary>
    /// Duración del token en minutos.
    /// </summary>
    public int TokenExpirationMinutes { get; init; } = 60;
}
