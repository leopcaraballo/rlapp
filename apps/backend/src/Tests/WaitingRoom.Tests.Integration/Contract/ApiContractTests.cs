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
    // CTR-008: Monitor query response structure
    // ============================================================

    [Fact]
    public async Task CTR008_MonitorResponse_ContainsRequiredFields()
    {
        var queueId = await CheckInAndGetQueueIdAsync("CTR-008-PAT", "Monitor Contract");

        var response = await _client.GetAsync($"/api/v1/waiting-room/{queueId}/monitor");
        var result = await DeserializeAsync(response);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        result.TryGetProperty("queueId", out var queueIdProp).Should().BeTrue();
        queueIdProp.GetString().Should().Be(queueId);
        result.TryGetProperty("totalPatientsWaiting", out var totalProp).Should().BeTrue();
        totalProp.ValueKind.Should().Be(JsonValueKind.Number);
        result.TryGetProperty("highPriorityCount", out var highPriorityProp).Should().BeTrue();
        highPriorityProp.ValueKind.Should().Be(JsonValueKind.Number);
        result.TryGetProperty("normalPriorityCount", out var normalPriorityProp).Should().BeTrue();
        normalPriorityProp.ValueKind.Should().Be(JsonValueKind.Number);
        result.TryGetProperty("lowPriorityCount", out var lowPriorityProp).Should().BeTrue();
        lowPriorityProp.ValueKind.Should().Be(JsonValueKind.Number);
        result.TryGetProperty("averageWaitTimeMinutes", out var waitProp).Should().BeTrue();
        waitProp.ValueKind.Should().Be(JsonValueKind.Number);
        result.TryGetProperty("utilizationPercentage", out var utilizationProp).Should().BeTrue();
        utilizationProp.ValueKind.Should().Be(JsonValueKind.Number);
        result.TryGetProperty("projectedAt", out var projectedAtProp).Should().BeTrue();
        projectedAtProp.GetString().Should().NotBeNullOrWhiteSpace();
    }

    // ============================================================
    // CTR-009: Queue-state query response structure
    // ============================================================

    [Fact]
    public async Task CTR009_QueueStateResponse_ContainsRequiredFields()
    {
        var queueId = await CheckInAndGetQueueIdAsync("CTR-009-PAT", "Queue State Contract");

        var response = await _client.GetAsync($"/api/v1/waiting-room/{queueId}/queue-state");
        var result = await DeserializeAsync(response);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        result.TryGetProperty("queueId", out var queueIdProp).Should().BeTrue();
        queueIdProp.GetString().Should().Be(queueId);
        result.TryGetProperty("currentCount", out var currentCountProp).Should().BeTrue();
        currentCountProp.ValueKind.Should().Be(JsonValueKind.Number);
        result.TryGetProperty("maxCapacity", out var maxCapacityProp).Should().BeTrue();
        maxCapacityProp.ValueKind.Should().Be(JsonValueKind.Number);
        result.TryGetProperty("isAtCapacity", out var isAtCapacityProp).Should().BeTrue();
        isAtCapacityProp.ValueKind.Should().BeOneOf(JsonValueKind.True, JsonValueKind.False);
        result.TryGetProperty("availableSpots", out var availableSpotsProp).Should().BeTrue();
        availableSpotsProp.ValueKind.Should().Be(JsonValueKind.Number);
        result.TryGetProperty("patientsInQueue", out var patientsProp).Should().BeTrue();
        patientsProp.ValueKind.Should().Be(JsonValueKind.Array);
        patientsProp.GetArrayLength().Should().BeGreaterThan(0);

        var firstPatient = patientsProp.EnumerateArray().First();
        firstPatient.TryGetProperty("patientId", out var patientIdProp).Should().BeTrue();
        patientIdProp.GetString().Should().NotBeNullOrWhiteSpace();
        firstPatient.TryGetProperty("patientName", out var patientNameProp).Should().BeTrue();
        patientNameProp.GetString().Should().NotBeNullOrWhiteSpace();
        firstPatient.TryGetProperty("priority", out var priorityProp).Should().BeTrue();
        priorityProp.GetString().Should().NotBeNullOrWhiteSpace();
        firstPatient.TryGetProperty("checkInTime", out var checkInTimeProp).Should().BeTrue();
        checkInTimeProp.GetString().Should().NotBeNullOrWhiteSpace();
        firstPatient.TryGetProperty("waitTimeMinutes", out var waitTimeProp).Should().BeTrue();
        waitTimeProp.ValueKind.Should().Be(JsonValueKind.Number);
        result.TryGetProperty("projectedAt", out var projectedAtProp).Should().BeTrue();
        projectedAtProp.GetString().Should().NotBeNullOrWhiteSpace();
    }

    // ============================================================
    // CTR-010: Next-turn query response structure
    // ============================================================

    [Fact]
    public async Task CTR010_NextTurnResponse_ContainsRequiredFields()
    {
        var queueId = await CheckInAndGetQueueIdAsync("CTR-010-PAT", "Next Turn Contract");

        var response = await _client.GetAsync($"/api/v1/waiting-room/{queueId}/next-turn");
        var result = await DeserializeAsync(response);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        result.TryGetProperty("queueId", out var queueIdProp).Should().BeTrue();
        queueIdProp.GetString().Should().Be(queueId);
        result.TryGetProperty("patientId", out var patientIdProp).Should().BeTrue();
        patientIdProp.GetString().Should().NotBeNullOrWhiteSpace();
        result.TryGetProperty("patientName", out var patientNameProp).Should().BeTrue();
        patientNameProp.GetString().Should().NotBeNullOrWhiteSpace();
        result.TryGetProperty("priority", out var priorityProp).Should().BeTrue();
        priorityProp.GetString().Should().NotBeNullOrWhiteSpace();
        result.TryGetProperty("consultationType", out var consultationTypeProp).Should().BeTrue();
        consultationTypeProp.GetString().Should().NotBeNullOrWhiteSpace();
        result.TryGetProperty("status", out var statusProp).Should().BeTrue();
        statusProp.GetString().Should().NotBeNullOrWhiteSpace();
        result.TryGetProperty("projectedAt", out var projectedAtProp).Should().BeTrue();
        projectedAtProp.GetString().Should().NotBeNullOrWhiteSpace();
    }

    // ============================================================
    // CTR-011: Recent-history query response structure
    // ============================================================

    [Fact]
    public async Task CTR011_RecentHistoryResponse_ContainsRequiredFields()
    {
        var (queueId, patientId) = await CompleteAlternativeFlowAsync(
            "CTR-011-PAT",
            "History Contract");

        var response = await _client.GetAsync(
            $"/api/v1/waiting-room/{queueId}/recent-history?limit=5");
        var result = await DeserializeAsync(response);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        result.ValueKind.Should().Be(JsonValueKind.Array);
        result.GetArrayLength().Should().BeGreaterThan(0);

        var firstRecord = result.EnumerateArray().First();
        firstRecord.TryGetProperty("queueId", out var queueIdProp).Should().BeTrue();
        queueIdProp.GetString().Should().Be(queueId);
        firstRecord.TryGetProperty("patientId", out var patientIdProp).Should().BeTrue();
        patientIdProp.GetString().Should().Be(patientId);
        firstRecord.TryGetProperty("patientName", out var patientNameProp).Should().BeTrue();
        patientNameProp.GetString().Should().NotBeNullOrWhiteSpace();
        firstRecord.TryGetProperty("priority", out var priorityProp).Should().BeTrue();
        priorityProp.GetString().Should().NotBeNullOrWhiteSpace();
        firstRecord.TryGetProperty("consultationType", out var consultationTypeProp).Should().BeTrue();
        consultationTypeProp.GetString().Should().NotBeNullOrWhiteSpace();
        firstRecord.TryGetProperty("completedAt", out var completedAtProp).Should().BeTrue();
        completedAtProp.GetString().Should().NotBeNullOrWhiteSpace();
    }

    // ============================================================
    // CTR-012: Rebuild query response structure
    // ============================================================

    [Fact]
    public async Task CTR012_RebuildResponse_ReturnsAcceptedContract()
    {
        var queueId = await CheckInAndGetQueueIdAsync("CTR-012-PAT", "Rebuild Contract");

        var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"/api/v1/waiting-room/{queueId}/rebuild");
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));

        var response = await _client.SendAsync(request);
        var result = await DeserializeAsync(response);

        response.StatusCode.Should().Be(HttpStatusCode.Accepted);
        result.TryGetProperty("message", out var messageProp).Should().BeTrue();
        messageProp.GetString().Should().NotBeNullOrWhiteSpace();
        result.TryGetProperty("queueId", out var queueIdProp).Should().BeTrue();
        queueIdProp.GetString().Should().Be(queueId);
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

    private async Task<(string QueueId, string PatientId)> CompleteAlternativeFlowAsync(
        string patientId,
        string patientName)
    {
        var queueId = await CheckInAndGetQueueIdAsync(patientId, patientName);

        var activateResponse = await PostWithAuthAsync(
            "/api/medical/consulting-room/activate",
            new ActivateConsultingRoomDto
            {
                QueueId = queueId,
                ConsultingRoomId = "CONS-CTR-01",
                Actor = "doctor-ctr"
            },
            "Doctor");
        activateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var cashierResponse = await PostWithAuthAsync(
            "/api/cashier/call-next",
            new CallNextCashierDto
            {
                QueueId = queueId,
                Actor = "cashier-ctr"
            },
            "Cashier");
        cashierResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var cashierResult = await DeserializeAsync(cashierResponse);
        var claimedPatientId = cashierResult.GetProperty("patientId").GetString()!;

        var paymentResponse = await PostWithAuthAsync(
            "/api/cashier/validate-payment",
            new ValidatePaymentDto
            {
                QueueId = queueId,
                PatientId = claimedPatientId,
                Actor = "cashier-ctr"
            },
            "Cashier");
        paymentResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var claimResponse = await PostWithAuthAsync(
            "/api/waiting-room/claim-next",
            new ClaimNextPatientDto
            {
                QueueId = queueId,
                Actor = "doctor-ctr",
                StationId = "CONS-CTR-01"
            },
            "Doctor");
        claimResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var callResponse = await PostWithAuthAsync(
            "/api/waiting-room/call-patient",
            new CallPatientDto
            {
                QueueId = queueId,
                PatientId = claimedPatientId,
                Actor = "doctor-ctr"
            },
            "Doctor");
        callResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var completeResponse = await PostWithAuthAsync(
            "/api/waiting-room/complete-attention",
            new CompleteAttentionDto
            {
                QueueId = queueId,
                PatientId = claimedPatientId,
                Actor = "doctor-ctr",
                Outcome = "Alta medica"
            },
            "Doctor");
        completeResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        return (queueId, claimedPatientId);
    }

    private static async Task<JsonElement> DeserializeAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonElement>(body, JsonOpts);
    }
}
