namespace WaitingRoom.Tests.Integration.API;

using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using WaitingRoom.Tests.Integration.Infrastructure;
using Xunit;

/// <summary>
/// Pruebas de autorizacion para los endpoints genericos de sala de espera.
///
/// Verifica que los endpoints /api/waiting-room/claim-next, /api/waiting-room/call-patient
/// y /api/waiting-room/complete-attention requieren rol Doctor o Admin (DoctorOnlyFilter).
///
/// Estos endpoints fueron identificados como desprotegidos en la auditoria de seguridad
/// (hallazgos S-05 y S-06) y corregidos con DoctorOnlyFilter.
/// </summary>
public sealed class GenericEndpointAuthorizationTests : IClassFixture<WaitingRoomApiFactory>
{
    private readonly HttpClient _client;

    public GenericEndpointAuthorizationTests(WaitingRoomApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ============================================================
    // Endpoints sin autenticacion deben retornar 401
    // ============================================================

    [Theory]
    [InlineData("/api/waiting-room/claim-next")]
    [InlineData("/api/waiting-room/call-patient")]
    [InlineData("/api/waiting-room/complete-attention")]
    public async Task GenericEndpoints_WithoutAuthentication_ReturnUnauthorized(string endpoint)
    {
        // Arrange
        var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(new
            {
                QueueId = "AUTH-QUEUE-01",
                PatientId = "AUTH-PAT-01",
                Actor = "test-actor",
                StationId = "CONS-01"
            }),
            Headers =
            {
                { "Idempotency-Key", Guid.NewGuid().ToString("D") }
                // Sin X-User-Role — no autenticado
            }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
            $"El endpoint {endpoint} debe requerir autenticacion");
    }

    // ============================================================
    // Roles no autorizados deben retornar 403
    // ============================================================

    [Theory]
    [InlineData("/api/waiting-room/claim-next", "Receptionist")]
    [InlineData("/api/waiting-room/claim-next", "Cashier")]
    [InlineData("/api/waiting-room/call-patient", "Receptionist")]
    [InlineData("/api/waiting-room/call-patient", "Cashier")]
    [InlineData("/api/waiting-room/complete-attention", "Receptionist")]
    [InlineData("/api/waiting-room/complete-attention", "Cashier")]
    public async Task GenericEndpoints_WithWrongRole_ReturnForbidden(
        string endpoint, string wrongRole)
    {
        // Arrange
        var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(new
            {
                QueueId = "AUTH-QUEUE-01",
                PatientId = "AUTH-PAT-01",
                Actor = "test-actor",
                StationId = "CONS-01"
            }),
            Headers =
            {
                { "Idempotency-Key", Guid.NewGuid().ToString("D") },
                { "X-User-Role", wrongRole }
            }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            $"El rol '{wrongRole}' no debe tener acceso al endpoint {endpoint}");
    }

    // ============================================================
    // Rol Doctor debe ser aceptado
    // ============================================================

    [Theory]
    [InlineData("/api/waiting-room/claim-next")]
    [InlineData("/api/waiting-room/call-patient")]
    [InlineData("/api/waiting-room/complete-attention")]
    public async Task GenericEndpoints_WithDoctorRole_DoNotReturnForbiddenOrUnauthorized(
        string endpoint)
    {
        // Arrange
        var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(new
            {
                QueueId = "AUTH-QUEUE-01",
                PatientId = "AUTH-PAT-01",
                Actor = "doctor-01",
                StationId = "CONS-01"
            }),
            Headers =
            {
                { "Idempotency-Key", Guid.NewGuid().ToString("D") },
                { "X-User-Role", "Doctor" }
            }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert — No debe ser 401 ni 403; puede ser 200 o error de dominio (404/409/500)
        response.StatusCode.Should().NotBe(HttpStatusCode.Unauthorized);
        response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden);
    }

    // ============================================================
    // Rol Admin debe ser aceptado (acceso universal)
    // ============================================================

    [Theory]
    [InlineData("/api/waiting-room/claim-next")]
    [InlineData("/api/waiting-room/call-patient")]
    [InlineData("/api/waiting-room/complete-attention")]
    public async Task GenericEndpoints_WithAdminRole_DoNotReturnForbiddenOrUnauthorized(
        string endpoint)
    {
        // Arrange
        var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(new
            {
                QueueId = "AUTH-QUEUE-01",
                PatientId = "AUTH-PAT-01",
                Actor = "admin-01",
                StationId = "CONS-01"
            }),
            Headers =
            {
                { "Idempotency-Key", Guid.NewGuid().ToString("D") },
                { "X-User-Role", "Admin" }
            }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert — Admin nunca debe recibir 401 o 403
        response.StatusCode.Should().NotBe(HttpStatusCode.Unauthorized);
        response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden);
    }
}
