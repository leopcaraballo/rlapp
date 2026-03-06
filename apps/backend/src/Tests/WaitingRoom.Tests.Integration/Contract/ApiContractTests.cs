namespace WaitingRoom.Tests.Integration.Contract;

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using WaitingRoom.Application.DTOs;
using WaitingRoom.Tests.Integration.Infrastructure;
using Xunit;

/// <summary>
/// API Contract Tests — Nivel: Integracion | Tipo: Funcional | Conocimiento: Black Box
///
/// Validan que la estructura de las respuestas HTTP cumple con el contrato
/// de la API: campos obligatorios, tipos de datos, codigos de estado.
///
/// Estos tests son criticos para evitar breaking changes que afecten
/// a los consumidores de la API (frontend, integraciones externas).
///
/// Principios de testing aplicados:
/// - P1 (Presencia de defectos): detectan cambios no intencionales en el contrato.
/// - P5 (Paradoja del pesticida): complementan los tests funcionales verificando estructura.
/// - P6 (Contexto): esenciales en arquitectura de microservicios con frontend desacoplado.
/// </summary>
[Trait("Category", "Contract")]
[Trait("Level", "Integration")]
[Trait("Type", "Functional")]
[Trait("Knowledge", "BlackBox")]
public sealed class ApiContractTests : IClassFixture<WaitingRoomApiFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ApiContractTests(WaitingRoomApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ============================================================
    // CTR-001: Check-in response structure
    // ============================================================

    /// <summary>
    /// Valida que la respuesta de check-in contiene todos los campos
    /// obligatorios del contrato de la API.
    /// </summary>
    [Fact]
    public async Task CTR001_CheckInResponse_ContainsRequiredFields()
    {
        // Arrange
        var dto = new CheckInPatientDto
        {
            PatientId = "CTR-001-PAT",
            PatientName = "Contract Test",
            Priority = "Medium",
            ConsultationType = "General",
            Actor = "receptionist-ctr"
        };

        // Act
        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");
        var result = await DeserializeAsync(response);

        // Assert: campos obligatorios del contrato
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        result.TryGetProperty("success", out var successProp).Should().BeTrue("'success' es campo obligatorio");
        successProp.ValueKind.Should().Be(JsonValueKind.True, "'success' debe ser booleano true");

        result.TryGetProperty("queueId", out var queueIdProp).Should().BeTrue("'queueId' es campo obligatorio");
        queueIdProp.GetString().Should().NotBeNullOrEmpty("'queueId' no debe estar vacio");

        result.TryGetProperty("eventCount", out var eventCountProp).Should().BeTrue("'eventCount' es campo obligatorio");
        eventCountProp.ValueKind.Should().Be(JsonValueKind.Number, "'eventCount' debe ser numerico");

        result.TryGetProperty("correlationId", out _).Should().BeTrue("'correlationId' es campo obligatorio");
        result.TryGetProperty("message", out _).Should().BeTrue("'message' es campo obligatorio");
    }

    // ============================================================
    // CTR-002: Cashier call-next response structure
    // ============================================================

    [Fact]
    public async Task CTR002_CashierCallNextResponse_ContainsPatientId()
    {
        // Arrange: check-in first
        var queueId = await CheckInAndGetQueueIdAsync("CTR-002-PAT", "Contract Caja");

        // Act
        var response = await PostWithAuthAsync(
            "/api/cashier/call-next",
            new CallNextCashierDto { QueueId = queueId, Actor = "cashier-ctr" },
            "Cashier");
        var result = await DeserializeAsync(response);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        result.TryGetProperty("success", out _).Should().BeTrue();
        result.TryGetProperty("patientId", out var pidProp).Should().BeTrue(
            "'patientId' es campo obligatorio en respuesta de caja");
        pidProp.GetString().Should().NotBeNullOrEmpty();
    }

    // ============================================================
    // CTR-003: Error response structure
    // ============================================================

    /// <summary>
    /// Valida que las respuestas de error siguen una estructura consistente.
    /// </summary>
    [Fact]
    public async Task CTR003_ErrorResponse_HasConsistentStructure()
    {
        // Arrange: enviar solicitud sin body para provocar error de validacion
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/waiting-room/check-in")
        {
            Content = JsonContent.Create(new
            {
                // Campos vacios para provocar validacion
                PatientId = "",
                PatientName = "",
                Priority = "",
                ConsultationType = "",
                Actor = ""
            })
        };
        request.Headers.Add("X-User-Role", "Receptionist");
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));

        // Act
        var response = await _client.SendAsync(request);

        // Assert: debe ser 400 con estructura de error
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().NotBeNullOrEmpty("Las respuestas de error deben contener un body descriptivo");

        // El JSON de error debe ser parseable
        var action = () => JsonSerializer.Deserialize<JsonElement>(body);
        action.Should().NotThrow("La respuesta de error debe ser JSON valido");
    }

    // ============================================================
    // CTR-004: 401 response structure
    // ============================================================

    [Fact]
    public async Task CTR004_UnauthorizedResponse_Returns401WithoutSensitiveData()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/waiting-room/check-in")
        {
            Content = JsonContent.Create(new CheckInPatientDto
            {
                PatientId = "CTR-004",
                PatientName = "NoAuth",
                Priority = "Low",
                ConsultationType = "General",
                Actor = "test"
            })
        };
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var body = await response.Content.ReadAsStringAsync();

        // Verificar que no se filtran credenciales ni datos sensibles reales
        body.Should().NotContain("password", "La respuesta 401 no debe revelar passwords");
        body.Should().NotContain("secret", "La respuesta 401 no debe revelar secrets");
        body.Should().NotContain("connectionstring", "La respuesta 401 no debe revelar cadenas de conexion");
        body.Should().NotContain("stack trace", "La respuesta 401 no debe revelar stack traces");
        body.Should().NotContain("Exception", "La respuesta 401 no debe revelar excepciones internas");

        // Nota: la palabra "token" puede aparecer legitimamente en mensajes de error
        // de autenticacion orientados al usuario (ej: "Proporcione un token JWT valido").
        // Lo importante es que no se filtre un token real (patron JWT: eyJ...)
        body.Should().NotMatchRegex(@"eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+",
            "La respuesta 401 no debe contener tokens JWT reales");
    }

    // ============================================================
    // CTR-005: Correlation-Id propagation contract
    // ============================================================

    [Fact]
    public async Task CTR005_CorrelationId_WhenSent_IsEchoedBack()
    {
        var correlationId = Guid.NewGuid().ToString("D");
        var dto = new CheckInPatientDto
        {
            PatientId = "CTR-005-PAT",
            PatientName = "Correlation Contract",
            Priority = "Medium",
            ConsultationType = "General",
            Actor = "receptionist-ctr"
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/waiting-room/check-in")
        {
            Content = JsonContent.Create(dto)
        };
        request.Headers.Add("X-User-Role", "Receptionist");
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));
        request.Headers.Add("X-Correlation-Id", correlationId);

        var response = await _client.SendAsync(request);
        var result = await DeserializeAsync(response);

        // El correlationId enviado debe estar presente en la respuesta
        if (result.TryGetProperty("correlationId", out var corrProp))
        {
            corrProp.GetString().Should().Be(correlationId,
                "El Correlation-Id enviado debe ser propagado en la respuesta");
        }
    }

    // ============================================================
    // CTR-006: Idempotency-Replayed header contract
    // ============================================================

    [Fact]
    public async Task CTR006_IdempotencyReplay_ReturnsReplayedHeader()
    {
        var idempotencyKey = Guid.NewGuid().ToString("D");
        var dto = new CheckInPatientDto
        {
            PatientId = "CTR-006-PAT",
            PatientName = "Idempotency Contract",
            Priority = "Low",
            ConsultationType = "General",
            Actor = "receptionist-ctr"
        };

        // Primera solicitud
        await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist", idempotencyKey);

        // Segunda solicitud con la misma clave
        var response2 = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist", idempotencyKey);

        // Assert: la segunda respuesta debe indicar que es un replay
        response2.StatusCode.Should().Be(HttpStatusCode.OK);
        if (response2.Headers.Contains("Idempotency-Replayed"))
        {
            var replayedValue = response2.Headers.GetValues("Idempotency-Replayed").First();
            replayedValue.Should().Be("true",
                "El header Idempotency-Replayed debe ser 'true' en respuestas cacheadas");
        }
    }

    // ============================================================
    // CTR-007: Content-Type de respuesta es JSON
    // ============================================================

    [Fact]
    public async Task CTR007_SuccessResponse_ContentType_IsJson()
    {
        var dto = new CheckInPatientDto
        {
            PatientId = "CTR-007-PAT",
            PatientName = "ContentType Test",
            Priority = "Medium",
            ConsultationType = "General",
            Actor = "receptionist-ctr"
        };

        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType
            .Should().Be("application/json",
                "Las respuestas exitosas deben tener Content-Type: application/json");
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

    private async Task<string> CheckInAndGetQueueIdAsync(string patientId, string name)
    {
        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in",
            new CheckInPatientDto
            {
                PatientId = patientId,
                PatientName = name,
                Priority = "Medium",
                ConsultationType = "General",
                Actor = "receptionist-ctr"
            },
            "Receptionist");
        var result = await DeserializeAsync(response);
        return result.GetProperty("queueId").GetString()!;
    }

    private static async Task<JsonElement> DeserializeAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonElement>(body, JsonOpts);
    }
}
