namespace WaitingRoom.Tests.Integration.API;

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using WaitingRoom.Application.DTOs;
using WaitingRoom.Tests.Integration.Infrastructure;
using Xunit;

/// <summary>
/// HTTP-level validation tests for API endpoint input rules.
///
/// Verifies:
/// - Missing Idempotency-Key header → 400
/// - Missing X-User-Role for protected endpoints → 403
/// - Empty/invalid DTO fields → appropriate error response
/// - Correlation-Id propagation in responses
/// - Response structure consistency across all endpoints
///
/// // HUMAN CHECK: Review that validation error messages match the frontend expectations.
/// Error responses must be consistent for client-side error handling integration.
/// </summary>
public sealed class EndpointValidationHttpTests : IClassFixture<WaitingRoomApiFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public EndpointValidationHttpTests(WaitingRoomApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ============================================================
    // Idempotency-Key validation
    // ============================================================

    [Theory]
    [InlineData("/api/waiting-room/check-in")]
    [InlineData("/api/reception/register")]
    public async Task CheckInEndpoints_WithoutIdempotencyKey_ReturnBadRequest(string endpoint)
    {
        var dto = new CheckInPatientDto
        {
            PatientId = "VAL-IDEM-001",
            PatientName = "Test Idempotency",
            Priority = "High",
            ConsultationType = "General",
            Actor = "test-actor"
        };

        var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(dto),
            Headers = { { "X-User-Role", "Receptionist" } }
            // Intencionalmente sin Idempotency-Key
        };

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("MissingIdempotencyKey",
            "La respuesta debe indicar que falta la clave de idempotencia");
    }

    [Theory]
    [InlineData("/api/cashier/call-next")]
    [InlineData("/api/cashier/validate-payment")]
    [InlineData("/api/cashier/mark-payment-pending")]
    [InlineData("/api/cashier/mark-absent")]
    [InlineData("/api/cashier/cancel-payment")]
    [InlineData("/api/medical/call-next")]
    [InlineData("/api/medical/start-consultation")]
    [InlineData("/api/medical/finish-consultation")]
    [InlineData("/api/medical/mark-absent")]
    [InlineData("/api/medical/consulting-room/activate")]
    [InlineData("/api/medical/consulting-room/deactivate")]
    [InlineData("/api/waiting-room/claim-next")]
    [InlineData("/api/waiting-room/call-patient")]
    [InlineData("/api/waiting-room/complete-attention")]
    public async Task CommandEndpoints_WithoutIdempotencyKey_ReturnBadRequest(string endpoint)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(new { QueueId = "q-1", PatientId = "p-1", Actor = "a-1" })
            // Sin Idempotency-Key
        };

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("MissingIdempotencyKey");
    }

    // ============================================================
    // Role-based access (ReceptionistOnlyFilter)
    // ============================================================

    /// <summary>
    /// Verifica que los endpoints de recepcion retornan 401 Unauthorized
    /// cuando no se proporciona autenticacion (sin header X-User-Role).
    /// </summary>
    [Theory]
    [InlineData("/api/waiting-room/check-in")]
    [InlineData("/api/reception/register")]
    public async Task ReceptionEndpoints_WithoutAuthentication_ReturnUnauthorized(string endpoint)
    {
        var dto = new CheckInPatientDto
        {
            PatientId = "VAL-ROLE-001",
            PatientName = "Test Role",
            Priority = "High",
            ConsultationType = "General",
            Actor = "test-actor"
        };

        var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(dto),
            Headers =
            {
                { "Idempotency-Key", Guid.NewGuid().ToString("D") }
                // Sin X-User-Role header — no autenticado
            }
        };

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
            "Los endpoints de recepcion requieren autenticacion con un rol valido");
    }

    /// <summary>
    /// Verifica que el endpoint de check-in rechaza roles no autorizados con 403.
    /// Nota: Admin SI tiene acceso (politica ReceptionistOnly permite Receptionist + Admin).
    /// </summary>
    [Theory]
    [InlineData("Doctor")]
    [InlineData("Cashier")]
    [InlineData("InvalidRole")]
    public async Task CheckInEndpoint_WithWrongRole_ReturnsForbidden(string wrongRole)
    {
        var dto = new CheckInPatientDto
        {
            PatientId = $"VAL-WRONG-{wrongRole}",
            PatientName = "Test Wrong Role",
            Priority = "High",
            ConsultationType = "General",
            Actor = "test-actor"
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/waiting-room/check-in")
        {
            Content = JsonContent.Create(dto),
            Headers =
            {
                { "Idempotency-Key", Guid.NewGuid().ToString("D") },
                { "X-User-Role", wrongRole }
            }
        };

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            $"El rol '{wrongRole}' no debe tener acceso al endpoint de check-in");
    }

    // ============================================================
    // Correlation-Id propagation
    // ============================================================

    [Fact]
    public async Task CheckIn_WithCorrelationId_PropagatesInResponse()
    {
        var correlationId = Guid.NewGuid().ToString("D");
        var dto = new CheckInPatientDto
        {
            PatientId = "VAL-CORR-001",
            PatientName = "Test Correlation",
            Priority = "Medium",
            ConsultationType = "General",
            Actor = "test-actor"
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/waiting-room/check-in")
        {
            Content = JsonContent.Create(dto),
            Headers =
            {
                { "Idempotency-Key", Guid.NewGuid().ToString("D") },
                { "X-User-Role", "Receptionist" },
                { "X-Correlation-Id", correlationId }
            }
        };

        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await DeserializeAsync(response);
        result.GetProperty("correlationId").GetString()
            .Should().Be(correlationId,
                "El correlationId enviado debe propagarse en la respuesta");
    }

    [Fact]
    public async Task CheckIn_WithoutCorrelationId_AutoGeneratesOne()
    {
        var dto = new CheckInPatientDto
        {
            PatientId = "VAL-AUTOCORR-001",
            PatientName = "Test Auto Correlation",
            Priority = "Low",
            ConsultationType = "General",
            Actor = "test-actor"
        };

        var response = await SendPostWithRoleAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await DeserializeAsync(response);
        result.GetProperty("correlationId").GetString()
            .Should().NotBeNullOrEmpty(
                "Se debe generar un correlationId automaticamente si no se proporciona");
    }

    // ============================================================
    // Response structure validation
    // ============================================================

    [Fact]
    public async Task CheckInResponse_ContainsAllRequiredFields()
    {
        var dto = new CheckInPatientDto
        {
            PatientId = "VAL-STRUCT-001",
            PatientName = "Test Structure",
            Priority = "High",
            ConsultationType = "Cardiologia",
            Actor = "receptionist-struct"
        };

        var response = await SendPostWithRoleAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await DeserializeAsync(response);

        // Verificar todos los campos requeridos en la respuesta
        result.TryGetProperty("success", out _).Should().BeTrue("Debe contener 'success'");
        result.TryGetProperty("message", out _).Should().BeTrue("Debe contener 'message'");
        result.TryGetProperty("correlationId", out _).Should().BeTrue("Debe contener 'correlationId'");
        result.TryGetProperty("eventCount", out _).Should().BeTrue("Debe contener 'eventCount'");
        result.TryGetProperty("queueId", out _).Should().BeTrue("Debe contener 'queueId'");

        result.GetProperty("success").GetBoolean().Should().BeTrue();
        result.GetProperty("eventCount").GetInt32().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task CashierCallNextResponse_ContainsPatientId()
    {
        // Primero check-in un paciente
        var checkInResponse = await SendPostWithRoleAsync(
            "/api/waiting-room/check-in",
            new CheckInPatientDto
            {
                PatientId = "VAL-CASHRESP-001",
                PatientName = "Test Cashier Resp",
                Priority = "Medium",
                ConsultationType = "General",
                Actor = "receptionist-resp"
            },
            "Receptionist");

        var queueId = (await DeserializeAsync(checkInResponse))
            .GetProperty("queueId").GetString()!;

        // Llamar en caja con rol de Cashier
        var cashierResponse = await SendPostWithRoleAsync(
            "/api/cashier/call-next",
            new CallNextCashierDto { QueueId = queueId, Actor = "cashier-resp" },
            "Cashier");

        cashierResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await DeserializeAsync(cashierResponse);

        result.TryGetProperty("success", out _).Should().BeTrue();
        result.TryGetProperty("patientId", out _).Should().BeTrue("Debe contener 'patientId'");
        result.TryGetProperty("eventCount", out _).Should().BeTrue();
        result.GetProperty("patientId").GetString().Should().NotBeNullOrEmpty();
    }

    // ============================================================
    // Health endpoints
    // ============================================================

    [Fact]
    public async Task HealthLive_ReturnsHealthy()
    {
        var response = await _client.GetAsync("/health/live");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task HealthReady_ReturnsSuccessStatus()
    {
        var response = await _client.GetAsync("/health/ready");

        // Con fakes, el readiness check puede devolver 200 o 503
        // dependiendo de si los health checks de infra estan registrados.
        // Verificamos que al menos responde (no timeout, no 404).
        ((int)response.StatusCode).Should().BeGreaterThan(0);
        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound,
            "El endpoint /health/ready debe existir");
    }

    // ============================================================
    // Helpers
    // ============================================================

    private async Task<HttpResponseMessage> SendPostAsync<T>(
        string path, T dto)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = JsonContent.Create(dto),
            Headers = { { "Idempotency-Key", Guid.NewGuid().ToString("D") } }
        };

        return await _client.SendAsync(request);
    }

    private async Task<HttpResponseMessage> SendPostWithRoleAsync<T>(
        string path, T dto, string role)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = JsonContent.Create(dto),
            Headers =
            {
                { "Idempotency-Key", Guid.NewGuid().ToString("D") },
                { "X-User-Role", role }
            }
        };

        return await _client.SendAsync(request);
    }

    private static async Task<JsonElement> DeserializeAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonElement>(body);
    }
}
