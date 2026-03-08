namespace WaitingRoom.Tests.Integration.NonFunctional.Security;

using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using WaitingRoom.Application.DTOs;
using WaitingRoom.Tests.Integration.Infrastructure;
using Xunit;

/// <summary>
/// Security Tests: Input Injection — Nivel: Sistema | Tipo: No Funcional (Seguridad)
/// Conocimiento: Black Box
///
/// Validan que la API es resistente a ataques de inyeccion comunes:
/// SQL Injection, XSS, Command Injection, Path Traversal, LDAP Injection.
///
/// En un sistema medico, la proteccion contra inyeccion es critica
/// (OWASP Top 10 — A03:2021 Injection).
///
/// Principios de testing aplicados:
/// - P1 (Presencia de defectos): detectan vulnerabilidades de inyeccion.
/// - P2 (Exhaustividad imposible): prueban los vectores mas comunes, no todos.
/// - P6 (Contexto): sistema medico requiere proteccion reforzada de datos.
/// </summary>
[Trait("Category", "Security")]
[Trait("Level", "System")]
[Trait("Type", "NonFunctional")]
[Trait("Knowledge", "BlackBox")]
public sealed class InputInjectionTests : IClassFixture<WaitingRoomApiFactory>
{
    private readonly HttpClient _client;

    public InputInjectionTests(WaitingRoomApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ============================================================
    // SEC-INJ-001: SQL Injection en PatientId
    // ============================================================

    [Theory]
    [InlineData("'; DROP TABLE patients; --")]
    [InlineData("1 OR 1=1")]
    [InlineData("' UNION SELECT * FROM users --")]
    [InlineData("'; EXEC xp_cmdshell('dir'); --")]
    [InlineData("1'; WAITFOR DELAY '0:0:5'; --")]
    public async Task SEC_INJ_001_SqlInjection_InPatientId_IsRejected(string maliciousId)
    {
        // Arrange
        var dto = new CheckInPatientDto
        {
            PatientId = maliciousId,
            PatientName = "Test Patient",
            Priority = "Low",
            ConsultationType = "General",
            Actor = "receptionist-sec"
        };

        // Act
        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        // Assert: debe rechazarse (400) o procesarse sin ejecutar SQL
        // El dominio valida PatientId (longitud, caracteres) antes de llegar a SQL
        var statusCode = (int)response.StatusCode;
        statusCode.Should().NotBe(500,
            $"La inyeccion SQL '{maliciousId}' no debe causar un error de servidor");
    }

    // ============================================================
    // SEC-INJ-002: SQL Injection en PatientName
    // ============================================================

    [Theory]
    [InlineData("Robert'); DROP TABLE events;--")]
    [InlineData("<script>alert('xss')</script>")]
    [InlineData("{{7*7}}")]
    [InlineData("${7*7}")]
    public async Task SEC_INJ_002_SqlInjection_InPatientName_IsHandled(string maliciousName)
    {
        var dto = new CheckInPatientDto
        {
            PatientId = "SEC-INJ-002-PAT",
            PatientName = maliciousName,
            Priority = "Low",
            ConsultationType = "General",
            Actor = "receptionist-sec"
        };

        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        var statusCode = (int)response.StatusCode;
        statusCode.Should().NotBe(500,
            $"El nombre malicioso '{maliciousName}' no debe causar un error de servidor");
    }

    // ============================================================
    // SEC-INJ-003: XSS en campos de texto
    // ============================================================

    [Theory]
    [InlineData("<img src=x onerror=alert(1)>")]
    [InlineData("<svg/onload=alert('XSS')>")]
    [InlineData("javascript:alert(document.cookie)")]
    [InlineData("<iframe src='http://evil.com'></iframe>")]
    [InlineData("'\"><script>alert(1)</script>")]
    public async Task SEC_INJ_003_XssPayloads_AreNeutralized(string xssPayload)
    {
        var dto = new CheckInPatientDto
        {
            PatientId = "SEC-XSS-PAT",
            PatientName = xssPayload,
            Priority = "Low",
            ConsultationType = "General",
            Actor = "receptionist-sec"
        };

        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        // Assert
        var statusCode = (int)response.StatusCode;
        statusCode.Should().NotBe(500,
            $"El payload XSS no debe causar un error de servidor");

        if (response.StatusCode == HttpStatusCode.OK)
        {
            var body = await response.Content.ReadAsStringAsync();
            body.Should().NotContain("<script>",
                "La respuesta no debe reflejar scripts sin escapar");
        }
    }

    // ============================================================
    // SEC-INJ-004: Command Injection en QueueId
    // ============================================================

    [Theory]
    [InlineData("$(whoami)")]
    [InlineData("`cat /etc/passwd`")]
    [InlineData("| ls -la")]
    [InlineData("; rm -rf /")]
    public async Task SEC_INJ_004_CommandInjection_InQueueId_IsRejected(string maliciousQueueId)
    {
        var dto = new CallNextCashierDto
        {
            QueueId = maliciousQueueId,
            Actor = "cashier-sec"
        };

        var response = await PostWithAuthAsync(
            "/api/cashier/call-next", dto, "Cashier");

        var statusCode = (int)response.StatusCode;
        statusCode.Should().NotBe(500,
            $"La inyeccion de comando '{maliciousQueueId}' no debe causar error de servidor");
    }

    // ============================================================
    // SEC-INJ-005: Path Traversal en campos
    // ============================================================

    [Theory]
    [InlineData("../../etc/passwd")]
    [InlineData("..\\..\\windows\\system32\\config\\sam")]
    [InlineData("%2e%2e%2f%2e%2e%2fetc%2fpasswd")]
    public async Task SEC_INJ_005_PathTraversal_IsRejected(string traversalPayload)
    {
        var dto = new CheckInPatientDto
        {
            PatientId = traversalPayload,
            PatientName = "Path Traversal Test",
            Priority = "Low",
            ConsultationType = "General",
            Actor = "receptionist-sec"
        };

        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        var statusCode = (int)response.StatusCode;
        statusCode.Should().NotBe(500,
            $"Path traversal '{traversalPayload}' no debe causar error de servidor");
    }

    // ============================================================
    // SEC-INJ-006: JSON malformado
    // ============================================================

    [Theory]
    [InlineData("{\"PatientId\": \"test\"")]           // JSON sin cerrar
    [InlineData("not json at all")]                      // Texto plano
    [InlineData("{\"PatientId\": null, \"__proto__\": {\"isAdmin\": true}}")]  // Prototype pollution
    [InlineData("")]                                     // Body vacio
    public async Task SEC_INJ_006_MalformedJson_IsRejected(string malformedBody)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/waiting-room/check-in")
        {
            Content = new StringContent(malformedBody, Encoding.UTF8, "application/json")
        };
        request.Headers.Add("X-User-Role", "Receptionist");
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));

        var response = await _client.SendAsync(request);

        var statusCode = (int)response.StatusCode;
        statusCode.Should().BeInRange(400, 499,
            $"JSON malformado debe ser rechazado con 4xx, no con 5xx");
    }

    // ============================================================
    // SEC-INJ-007: Payload extremadamente grande
    // ============================================================

    [Fact]
    public async Task SEC_INJ_007_OversizedPayload_IsRejected()
    {
        // Crear un PatientName de 100KB
        var oversizedName = new string('A', 100_000);

        var dto = new CheckInPatientDto
        {
            PatientId = "SEC-OVER-PAT",
            PatientName = oversizedName,
            Priority = "Low",
            ConsultationType = "General",
            Actor = "receptionist-sec"
        };

        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        var statusCode = (int)response.StatusCode;
        statusCode.Should().NotBe(500,
            "Un payload sobredimensionado no debe causar error de servidor");
    }

    // ============================================================
    // SEC-INJ-008: Content-Type incorrecto
    // ============================================================

    [Theory]
    [InlineData("text/plain")]
    [InlineData("application/xml")]
    [InlineData("multipart/form-data")]
    public async Task SEC_INJ_008_WrongContentType_IsRejected(string contentType)
    {
        var body = "{\"PatientId\": \"test\", \"PatientName\": \"test\"}";
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/waiting-room/check-in")
        {
            Content = new StringContent(body, Encoding.UTF8, contentType)
        };
        request.Headers.Add("X-User-Role", "Receptionist");
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));

        var response = await _client.SendAsync(request);

        var statusCode = (int)response.StatusCode;
        statusCode.Should().NotBe(500,
            $"Content-Type '{contentType}' no debe causar error de servidor");
    }

    // ============================================================
    // Helpers
    // ============================================================

    private async Task<HttpResponseMessage> PostWithAuthAsync<T>(
        string path, T dto, string role)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = JsonContent.Create(dto)
        };
        request.Headers.Add("X-User-Role", role);
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));
        return await _client.SendAsync(request);
    }
}
