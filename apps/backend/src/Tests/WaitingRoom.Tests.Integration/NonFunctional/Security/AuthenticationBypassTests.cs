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
/// Security Tests: Authentication Bypass — Nivel: Sistema | Tipo: No Funcional (Seguridad)
/// Conocimiento: Black Box
///
/// Validan que los mecanismos de autenticacion no pueden ser eludidos
/// mediante tecnicas comunes de ataque.
///
/// Principios de testing aplicados:
/// - P1 (Presencia de defectos): detectan vulnerabilidades de autenticacion.
/// - P4 (Agrupacion de defectos): la autenticacion es un area con alta densidad de defectos.
/// - P6 (Contexto): tests criticos para un sistema medico con datos sensibles.
/// </summary>
[Trait("Category", "Security")]
[Trait("Level", "System")]
[Trait("Type", "NonFunctional")]
[Trait("Knowledge", "BlackBox")]
public sealed class AuthenticationBypassTests : IClassFixture<WaitingRoomApiFactory>
{
    private readonly HttpClient _client;

    public AuthenticationBypassTests(WaitingRoomApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ============================================================
    // SEC-AUTH-001: Sin autenticacion en todos los endpoints de comando
    // ============================================================

    [Theory]
    [InlineData("/api/atencion/check-in")]
    [InlineData("/api/cashier/call-next")]
    [InlineData("/api/cashier/validate-payment")]
    [InlineData("/api/cashier/mark-absent")]
    [InlineData("/api/cashier/cancel-payment")]
    [InlineData("/api/cashier/mark-payment-pending")]
    [InlineData("/api/medical/call-next")]
    [InlineData("/api/medical/consulting-room/activate")]
    [InlineData("/api/medical/consulting-room/deactivate")]
    [InlineData("/api/medical/start-consultation")]
    [InlineData("/api/medical/finish-consultation")]
    [InlineData("/api/medical/mark-absent")]
    [InlineData("/api/atencion/claim-next")]
    [InlineData("/api/atencion/call-patient")]
    [InlineData("/api/atencion/complete-attention")]
    [InlineData("/api/reception/register")]
    public async Task SEC_AUTH_001_AllCommandEndpoints_RejectUnauthenticatedRequests(
        string endpoint)
    {
        // Arrange: sin header X-User-Role (no autenticado)
        var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(new
            {
                ServiceId = "SEC-Q", PatientId = "SEC-P", PatientName = "Test",
                Priority = "Low", ConsultationType = "General", Actor = "attacker",
                StationId = "S-01", ConsultingRoomId = "C-01",
                Outcome = "Completed", Reason = "Insufficient funds",
                PaymentReference = "REF-123"
            })
        };
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
            $"SEC-AUTH-001: {endpoint} debe rechazar solicitudes sin autenticacion");
    }

    // ============================================================
    // SEC-AUTH-002: Header de rol vacio
    // ============================================================

    [Theory]
    [InlineData("/api/atencion/check-in")]
    [InlineData("/api/cashier/call-next")]
    [InlineData("/api/medical/call-next")]
    public async Task SEC_AUTH_002_EmptyRoleHeader_IsRejected(string endpoint)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(new
            {
                ServiceId = "SEC-Q2", PatientId = "SEC-P2", PatientName = "Test",
                Priority = "Low", ConsultationType = "General", Actor = "attacker",
                StationId = "S-01", Reason = "Testing"
            })
        };
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));
        request.Headers.Add("X-User-Role", "");

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
            "Un header de rol vacio no debe otorgar autenticacion");
    }

    // ============================================================
    // SEC-AUTH-003: Rol inventado no otorga acceso
    // ============================================================

    [Theory]
    [InlineData("/api/atencion/check-in", "SuperAdmin")]
    [InlineData("/api/atencion/check-in", "Root")]
    [InlineData("/api/atencion/check-in", "System")]
    [InlineData("/api/cashier/call-next", "Janitor")]
    [InlineData("/api/medical/call-next", "Patient")]
    public async Task SEC_AUTH_003_InventedRoles_AreRejected(
        string endpoint, string fakeRole)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(new
            {
                ServiceId = "SEC-Q3", PatientId = "SEC-P3", PatientName = "Test",
                Priority = "Low", ConsultationType = "General", Actor = "attacker",
                StationId = "S-01"
            })
        };
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));
        request.Headers.Add("X-User-Role", fakeRole);

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().BeOneOf(
            new[] { HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized },
            $"El rol inventado '{fakeRole}' no debe otorgar acceso a {endpoint}");
    }

    // ============================================================
    // SEC-AUTH-004: Multiples headers de rol
    // ============================================================

    /// <summary>
    /// Verifica que enviar multiples valores en el header X-User-Role
    /// no confunde al sistema de autenticacion.
    /// </summary>
    [Fact]
    public async Task SEC_AUTH_004_MultipleRoleHeaders_DoNotEscalatePrivileges()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/medical/call-next")
        {
            Content = JsonContent.Create(new
            {
                ServiceId = "SEC-Q4", Actor = "attacker", StationId = "S-01"
            })
        };
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));
        request.Headers.Add("X-User-Role", "Receptionist");
        // Intentar agregar un segundo valor para el mismo header
        request.Headers.TryAddWithoutValidation("X-User-Role", "Doctor");

        var response = await _client.SendAsync(request);

        // No debe obtener acceso como Doctor
        response.StatusCode.Should().NotBe(HttpStatusCode.OK,
            "Multiples headers de rol no deben otorgar escalacion de privilegios");
    }

    // ============================================================
    // SEC-AUTH-005: Respuestas no filtran informacion interna
    // ============================================================

    [Fact]
    public async Task SEC_AUTH_005_ErrorResponses_DoNotLeakInternalInformation()
    {
        // Arrange: forzar un error de dominio
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/cashier/call-next")
        {
            Content = JsonContent.Create(new CallNextCashierDto
            {
                ServiceId = "NONEXISTENT-QUEUE-ID",
                Actor = "cashier-sec"
            })
        };
        request.Headers.Add("X-User-Role", "Cashier");
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));

        // Act
        var response = await _client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        // Assert: la respuesta NO debe contener trazas internas
        body.Should().NotContain("StackTrace", "No se deben exponer trazas de stack");
        body.Should().NotContain("NpgsqlException", "No se deben exponer excepciones de infraestructura");
        body.Should().NotContain("password", "No se deben exponer credenciales");
        body.Should().NotContain("connection string", "No se deben exponer connection strings");
    }

    // ============================================================
    // SEC-AUTH-006: Health endpoints SI son publicos
    // ============================================================

    [Theory]
    [InlineData("/health/live")]
    [InlineData("/health/ready")]
    public async Task SEC_AUTH_006_HealthEndpoints_ArePublic(string endpoint)
    {
        // Sin autenticacion
        var response = await _client.GetAsync(endpoint);

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            $"Los endpoints de salud deben ser publicos: {endpoint}");
    }
}
