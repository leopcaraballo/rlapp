namespace WaitingRoom.API.Security;

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

/// <summary>
/// Generador de tokens JWT para autenticación.
///
/// Genera tokens firmados con HMAC-SHA256 que incluyen:
/// - sub: identificador del usuario
/// - name: nombre del usuario
/// - role: rol del usuario (Receptionist, Cashier, Doctor, Admin)
/// - iat: fecha de emisión
/// - exp: fecha de expiración
///
/// Uso: endpoint POST /api/auth/token para obtener un token.
///
/// // HUMAN CHECK: En un sistema de producción real, la generación de tokens
/// // debería delegarse a un Identity Provider externo (Keycloak, Auth0, Azure AD).
/// // Este generador integrado es adecuado para desarrollo y pruebas.
/// </summary>
public sealed class JwtTokenGenerator
{
    private readonly JwtOptions _options;

    public JwtTokenGenerator(JwtOptions options)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
    }

    /// <summary>
    /// Genera un token JWT para el usuario especificado.
    /// </summary>
    /// <param name="userId">Identificador único del usuario.</param>
    /// <param name="userName">Nombre visible del usuario.</param>
    /// <param name="role">Rol del usuario (Receptionist, Cashier, Doctor, Admin).</param>
    /// <returns>Token JWT firmado como string.</returns>
    public string GenerateToken(string userId, string userName, string role)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userId);
        ArgumentException.ThrowIfNullOrWhiteSpace(userName);
        ArgumentException.ThrowIfNullOrWhiteSpace(role);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim(JwtRegisteredClaimNames.Name, userName),
            new Claim(ClaimTypes.Role, role),
            new Claim("role", role), // Claim adicional para compatibilidad con frontend
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("D")),
            new Claim(JwtRegisteredClaimNames.Iat,
                new DateTimeOffset(DateTime.UtcNow).ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64)
        };

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddMinutes(_options.TokenExpirationMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
