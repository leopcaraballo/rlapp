namespace WaitingRoom.Tests.Integration.NonFunctional.Security;

using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using WaitingRoom.Application.DTOs;
using WaitingRoom.Tests.Integration.Infrastructure;
using Xunit;

/// <summary>
/// Security Tests: Privilege Escalation — Nivel: Sistema | Tipo: No Funcional (Seguridad)
/// Conocimiento: Black Box
///
/// Validan que un usuario autenticado con rol X no puede ejecutar acciones
/// reservadas para rol Y (escalacion horizontal y vertical de privilegios).
///
/// Modelo de roles del sistema:
/// - Receptionist: solo check-in / register
/// - Cashier: solo flujo de caja
/// - Doctor: solo flujo medico
/// - Admin: acceso universal
///
/// Esto implementa el principio de minimo privilegio (OWASP A01:2021 Broken Access Control).
///
/// Principios de testing aplicados:
/// - P1 (Presencia de defectos): detectan fallos de control de acceso.
/// - P4 (Agrupacion): los controles de acceso concentran vulnerabilidades.
/// - P7 (Ausencia de errores): un sistema sin errores de lógica puede tener
///       fallos de seguridad criticos.
/// </summary>
[Trait("Category", "Security")]
[Trait("Level", "System")]
[Trait("Type", "NonFunctional")]
[Trait("Knowledge", "BlackBox")]
public sealed class PrivilegeEscalationTests : IClassFixture<WaitingRoomApiFactory>
{
    private readonly HttpClient _client;

    public PrivilegeEscalationTests(WaitingRoomApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ============================================================
    // SEC-PRIV-001: Receptionist NO debe acceder a endpoints de Cashier
    // ============================================================

    [Theory]
    [InlineData("/api/cashier/call-next")]
    [InlineData("/api/cashier/validate-payment")]
    [InlineData("/api/cashier/mark-absent")]
    [InlineData("/api/cashier/cancel-payment")]
    [InlineData("/api/cashier/mark-payment-pending")]
    public async Task SEC_PRIV_001_Receptionist_CannotAccessCashierEndpoints(string endpoint)
    {
        var request = CreateRequest(endpoint, "Receptionist");

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            $"Receptionist no debe acceder a {endpoint}");
    }

    // ============================================================
    // SEC-PRIV-002: Receptionist NO debe acceder a endpoints de Doctor
    // ============================================================

    [Theory]
    [InlineData("/api/medical/call-next")]
    [InlineData("/api/medical/consulting-room/activate")]
    [InlineData("/api/medical/consulting-room/deactivate")]
    [InlineData("/api/medical/start-consultation")]
    [InlineData("/api/medical/finish-consultation")]
    [InlineData("/api/medical/mark-absent")]
    [InlineData("/api/atencion/claim-next")]
    [InlineData("/api/atencion/call-patient")]
    [InlineData("/api/atencion/complete-attention")]
    public async Task SEC_PRIV_002_Receptionist_CannotAccessMedicalEndpoints(string endpoint)
    {
        var request = CreateRequest(endpoint, "Receptionist");

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            $"Receptionist no debe acceder a endpoints medicos: {endpoint}");
    }

    // ============================================================
    // SEC-PRIV-003: Cashier NO debe acceder a endpoints de Doctor
    // ============================================================

    [Theory]
    [InlineData("/api/medical/call-next")]
    [InlineData("/api/medical/consulting-room/activate")]
    [InlineData("/api/medical/start-consultation")]
    [InlineData("/api/medical/finish-consultation")]
    [InlineData("/api/atencion/claim-next")]
    [InlineData("/api/atencion/call-patient")]
    [InlineData("/api/atencion/complete-attention")]
    public async Task SEC_PRIV_003_Cashier_CannotAccessMedicalEndpoints(string endpoint)
    {
        var request = CreateRequest(endpoint, "Cashier");

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            $"Cashier no debe acceder a endpoints medicos: {endpoint}");
    }

    // ============================================================
    // SEC-PRIV-004: Doctor NO debe acceder a endpoints de Receptionist
    // ============================================================

    [Theory]
    [InlineData("/api/atencion/check-in")]
    [InlineData("/api/reception/register")]
    [InlineData("/api/medical/consulting-room/activate")]
    [InlineData("/api/medical/consulting-room/deactivate")]
    public async Task SEC_PRIV_004_Doctor_CannotAccessReceptionOrAdminEndpoints(string endpoint)
    {
        var request = CreateRequest(endpoint, "Doctor");

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            $"Doctor no debe acceder a endpoints de recepcion: {endpoint}");
    }

    // ============================================================
    // SEC-PRIV-005: Doctor NO debe acceder a endpoints de Cashier
    // ============================================================

    [Theory]
    [InlineData("/api/cashier/call-next")]
    [InlineData("/api/cashier/validate-payment")]
    [InlineData("/api/cashier/mark-absent")]
    [InlineData("/api/cashier/cancel-payment")]
    [InlineData("/api/cashier/mark-payment-pending")]
    public async Task SEC_PRIV_005_Doctor_CannotAccessCashierEndpoints(string endpoint)
    {
        var request = CreateRequest(endpoint, "Doctor");

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            $"Doctor no debe acceder a endpoints de caja: {endpoint}");
    }

    // ============================================================
    // SEC-PRIV-006: Admin SI tiene acceso universal
    // ============================================================

    [Theory]
    [InlineData("/api/atencion/check-in")]
    [InlineData("/api/cashier/call-next")]
    [InlineData("/api/medical/call-next")]
    [InlineData("/api/atencion/claim-next")]
    public async Task SEC_PRIV_006_Admin_HasUniversalAccess(string endpoint)
    {
        var request = CreateRequest(endpoint, "Admin");

        var response = await _client.SendAsync(request);

        // Admin no debe recibir 401 ni 403; puede recibir errores de dominio (400, 404, etc.)
        response.StatusCode.Should().NotBe(HttpStatusCode.Unauthorized);
        response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden,
            $"Admin debe tener acceso universal a {endpoint}");
    }

    // ============================================================
    // SEC-PRIV-007: Manipulacion de rol via case sensitivity
    // ============================================================

    [Theory]
    [InlineData("receptionist")]   // minusculas
    [InlineData("RECEPTIONIST")]   // mayusculas
    [InlineData("rEcEpTiOnIsT")]   // mixto
    public async Task SEC_PRIV_007_RoleCaseSensitivity_DoesNotBypassAuth(string caseVariant)
    {
        // Intentar acceder a un endpoint de Doctor con variantes de "Receptionist"
        var request = CreateRequest("/api/medical/call-next", caseVariant);

        var response = await _client.SendAsync(request);

        // No debe obtener acceso a endpoint medico
        response.StatusCode.Should().NotBe(HttpStatusCode.OK,
            $"La variante de caso '{caseVariant}' no debe otorgar acceso a endpoints medicos");
    }

    // ============================================================
    // Helpers
    // ============================================================

    private static HttpRequestMessage CreateRequest(string endpoint, string role)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(new
            {
                ServiceId = "SEC-PRIV-Q",
                PatientId = "SEC-PRIV-P",
                PatientName = "Privilege Test",
                Priority = "Low",
                ConsultationType = "General",
                Actor = "test-actor",
                StationId = "CONS-01",
                ConsultingRoomId = "CONS-01",
                PaymentReference = "PAY-SEC",
                Reason = "Security test",
                Outcome = "Completed",
                Notes = "Security testing notes"
            })
        };
        request.Headers.Add("X-User-Role", role);
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));
        return request;
    }
}
