namespace WaitingRoom.Tests.Integration.Functional;

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using WaitingRoom.Application.DTOs;
using WaitingRoom.Tests.Integration.Infrastructure;
using Xunit;

/// <summary>
/// Sanity Tests — Nivel: Sistema | Tipo: Funcional (Sanity) | Conocimiento: Black Box
///
/// Validan que las funcionalidades principales del sistema operan correctamente
/// despues de un cambio o despliegue. A diferencia de los smoke tests, estos
/// ejecutan flujos de negocio reales pero acotados.
///
/// Principios de testing aplicados:
/// - P1 (Presencia de defectos): verifican funcionalidad critica sin pretender exhaustividad.
/// - P2 (Exhaustividad imposible): seleccionan un subconjunto representativo de flujos.
/// - P4 (Agrupacion de defectos): se enfocan en las areas con mayor riesgo de regresion.
/// </summary>
[Trait("Category", "Sanity")]
[Trait("Level", "System")]
[Trait("Type", "Functional")]
[Trait("Knowledge", "BlackBox")]
public sealed class SanityTests : IClassFixture<WaitingRoomApiFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public SanityTests(WaitingRoomApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ============================================================
    // SAN-001: Flujo basico de check-in funciona
    // ============================================================

    /// <summary>
    /// Verifica que un paciente puede ser registrado (check-in) via HTTP
    /// y que la respuesta contiene los campos esperados.
    /// </summary>
    [Fact]
    public async Task SAN001_BasicCheckIn_CreatesPatientSuccessfully()
    {
        // Arrange
        var dto = new CheckInPatientDto
        {
            PatientId = "SAN-PAT-001",
            PatientName = "Paciente Sanity",
            Priority = "Medium",
            ConsultationType = "General",
            Actor = "receptionist-sanity"
        };

        // Act
        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await DeserializeAsync(response);
        result.GetProperty("success").GetBoolean().Should().BeTrue();
        result.GetProperty("queueId").GetString().Should().NotBeNullOrEmpty();
        result.GetProperty("eventCount").GetInt32().Should().BeGreaterOrEqualTo(1);
    }

    // ============================================================
    // SAN-002: Flujo basico de caja funciona
    // ============================================================

    /// <summary>
    /// Verifica que un paciente registrado puede ser llamado en caja.
    /// </summary>
    [Fact]
    public async Task SAN002_BasicCashierCall_ReturnsPatient()
    {
        // Arrange: check-in primero
        var queueId = await CheckInPatientAsync("SAN-PAT-002", "Sanity Caja");

        // Act: llamar en caja
        var response = await PostWithAuthAsync(
            "/api/cashier/call-next",
            new CallNextCashierDto { QueueId = queueId, Actor = "cashier-sanity" },
            "Cashier");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await DeserializeAsync(response);
        result.GetProperty("success").GetBoolean().Should().BeTrue();
        result.GetProperty("patientId").GetString().Should().NotBeNullOrEmpty();
    }

    // ============================================================
    // SAN-003: Validacion de pago funciona
    // ============================================================

    [Fact]
    public async Task SAN003_BasicPaymentValidation_Succeeds()
    {
        // Arrange
        var queueId = await CheckInPatientAsync("SAN-PAT-003", "Sanity Pago");
        var patientId = await CallNextCashierAsync(queueId);

        // Act
        var response = await PostWithAuthAsync(
            "/api/cashier/validate-payment",
            new ValidatePaymentDto
            {
                QueueId = queueId,
                PatientId = patientId,
                Actor = "cashier-sanity",
                PaymentReference = "PAY-SAN-001"
            },
            "Cashier");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await DeserializeAsync(response);
        result.GetProperty("success").GetBoolean().Should().BeTrue();
    }

    // ============================================================
    // SAN-004: Idempotencia de check-in funciona
    // ============================================================

    /// <summary>
    /// Verifica que enviar el mismo check-in con la misma clave de idempotencia
    /// retorna la misma respuesta sin crear un duplicado.
    /// </summary>
    [Fact]
    public async Task SAN004_IdempotentCheckIn_ReturnsSameResponse()
    {
        // Arrange
        var dto = new CheckInPatientDto
        {
            PatientId = "SAN-PAT-004",
            PatientName = "Idempotente Sanity",
            Priority = "Low",
            ConsultationType = "General",
            Actor = "receptionist-sanity"
        };
        var idempotencyKey = Guid.NewGuid().ToString("D");

        // Act: enviar dos veces con la misma clave
        var response1 = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist", idempotencyKey);
        var response2 = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist", idempotencyKey);

        // Assert
        response1.StatusCode.Should().Be(HttpStatusCode.OK);
        response2.StatusCode.Should().Be(HttpStatusCode.OK);

        var body1 = await response1.Content.ReadAsStringAsync();
        var body2 = await response2.Content.ReadAsStringAsync();
        body1.Should().Be(body2, "La respuesta idempotente debe ser identica");
    }

    // ============================================================
    // SAN-005: Autenticacion basica funciona
    // ============================================================

    [Fact]
    public async Task SAN005_UnauthenticatedRequest_Returns401()
    {
        // Arrange: sin header X-User-Role
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/waiting-room/check-in")
        {
            Content = JsonContent.Create(new CheckInPatientDto
            {
                PatientId = "SAN-PAT-005",
                PatientName = "Sin Auth",
                Priority = "Low",
                ConsultationType = "General",
                Actor = "nobody"
            })
        };
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // SAN-006: Respuesta contiene Correlation-Id
    // ============================================================

    [Fact]
    public async Task SAN006_AllResponses_ContainCorrelationId()
    {
        // Arrange
        var dto = new CheckInPatientDto
        {
            PatientId = "SAN-PAT-006",
            PatientName = "Correlation Sanity",
            Priority = "High",
            ConsultationType = "Urgencias",
            Actor = "receptionist-sanity"
        };

        // Act
        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await DeserializeAsync(response);
        result.TryGetProperty("correlationId", out _).Should().BeTrue(
            "La respuesta debe incluir un correlationId para trazabilidad");
    }

    // ============================================================
    // Helpers
    // ============================================================

    private async Task<HttpResponseMessage> PostWithAuthAsync<T>(
        string path, T dto, string role, string? idempotencyKey = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = JsonContent.Create(dto)
        };
        request.Headers.Add("X-User-Role", role);
        request.Headers.Add("Idempotency-Key", idempotencyKey ?? Guid.NewGuid().ToString("D"));
        return await _client.SendAsync(request);
    }

    private async Task<string> CheckInPatientAsync(string patientId, string patientName)
    {
        var dto = new CheckInPatientDto
        {
            PatientId = patientId,
            PatientName = patientName,
            Priority = "Medium",
            ConsultationType = "General",
            Actor = "receptionist-sanity"
        };
        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");
        var result = await DeserializeAsync(response);
        return result.GetProperty("queueId").GetString()!;
    }

    private async Task<string> CallNextCashierAsync(string queueId)
    {
        var response = await PostWithAuthAsync(
            "/api/cashier/call-next",
            new CallNextCashierDto { QueueId = queueId, Actor = "cashier-sanity" },
            "Cashier");
        var result = await DeserializeAsync(response);
        return result.GetProperty("patientId").GetString()!;
    }

    private static async Task<JsonElement> DeserializeAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonElement>(body, JsonOpts);
    }
}
